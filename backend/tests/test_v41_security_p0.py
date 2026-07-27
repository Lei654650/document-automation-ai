from __future__ import annotations

import zipfile
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.security.login_guard import LoginGuard
from app.security.rate_limit import InMemoryRateLimiter
from app.security.upload_guard import validate_uploaded_file
from app.security.webhook_guard import WebhookReplayGuard


def test_rate_limiter_blocks_after_limit() -> None:
    limiter = InMemoryRateLimiter()
    assert limiter.allow("ip", 2, 60)[0] is True
    assert limiter.allow("ip", 2, 60)[0] is True
    allowed, retry_after = limiter.allow("ip", 2, 60)
    assert allowed is False
    assert retry_after >= 1


def test_login_guard_locks_and_resets(monkeypatch) -> None:
    from app.security import login_guard as module_guard
    from app.security.config import CONFIG

    guard = LoginGuard()
    for _ in range(CONFIG.login_max_failures - 1):
        assert guard.failure("a@example.com", "127.0.0.1") == 0
    assert guard.failure("a@example.com", "127.0.0.1") == CONFIG.login_lock_seconds
    assert guard.check("a@example.com", "127.0.0.1") > 0
    guard.success("a@example.com", "127.0.0.1")
    assert guard.check("a@example.com", "127.0.0.1") == 0


def test_upload_guard_accepts_pdf(tmp_path: Path) -> None:
    target = tmp_path / "sample.pdf"
    target.write_bytes(b"%PDF-1.7\nbody")
    validate_uploaded_file(target, "sample.pdf")


def test_upload_guard_rejects_executable_disguised_as_pdf(tmp_path: Path) -> None:
    target = tmp_path / "sample.pdf"
    target.write_bytes(b"MZ" + b"0" * 20)
    with pytest.raises(HTTPException):
        validate_uploaded_file(target, "sample.pdf")
    assert not target.exists()


def test_upload_guard_accepts_valid_docx_structure(tmp_path: Path) -> None:
    target = tmp_path / "sample.docx"
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<document/>")
    validate_uploaded_file(target, "sample.docx")


def test_webhook_replay_guard_rejects_duplicate() -> None:
    guard = WebhookReplayGuard()
    assert guard.accept("stripe", "evt_1") is True
    assert guard.accept("stripe", "evt_1") is False


def test_upload_guard_rejects_path_traversal_zip(tmp_path: Path) -> None:
    target = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("../escape.txt", "bad")
    with pytest.raises(HTTPException):
        validate_uploaded_file(target, "unsafe.zip")
    assert not target.exists()


def test_upload_guard_rejects_script_inside_zip(tmp_path: Path) -> None:
    target = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("payload/run.ps1", "Write-Host bad")
    with pytest.raises(HTTPException):
        validate_uploaded_file(target, "unsafe.zip")
    assert not target.exists()


def test_upload_guard_rejects_macro_part_in_docx(tmp_path: Path) -> None:
    target = tmp_path / "unsafe.docx"
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<document/>")
        archive.writestr("word/vbaProject.bin", b"macro")
    with pytest.raises(HTTPException):
        validate_uploaded_file(target, "unsafe.docx")
    assert not target.exists()


def test_upload_guard_accepts_safe_generic_zip(tmp_path: Path) -> None:
    target = tmp_path / "safe.zip"
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("documents/readme.txt", "safe")
    validate_uploaded_file(target, "safe.zip")
    assert target.exists()



def _request(headers: dict[str, str] | None = None, path: str = "/api/orders"):
    from starlette.requests import Request
    raw_headers = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "method": "GET", "path": path, "headers": raw_headers, "client": ("127.0.0.1", 1234), "scheme": "https", "server": ("test", 443), "query_string": b""})


def _edge_config(**overrides):
    from dataclasses import replace
    from app.security.config import CONFIG
    return replace(CONFIG, **overrides)


def test_edge_guard_blocks_known_scanner_user_agent() -> None:
    from app.security.edge_guard import EdgeGuard
    guard = EdgeGuard(_edge_config(bot_block_enabled=True))
    decision = guard.evaluate(_request({"user-agent": "sqlmap/1.8"}), "127.0.0.1")
    assert decision.allowed is False
    assert decision.reason == "known_bad_bot"


def test_edge_guard_accepts_normal_browser() -> None:
    from app.security.edge_guard import EdgeGuard
    guard = EdgeGuard(_edge_config(bot_block_enabled=True))
    decision = guard.evaluate(_request({"user-agent": "Mozilla/5.0", "cf-ray": "abc-SIN", "cf-ipcountry": "VN"}), "127.0.0.1")
    assert decision.allowed is True


def test_edge_guard_cloudflare_requirement() -> None:
    from app.security.edge_guard import EdgeGuard
    guard = EdgeGuard(_edge_config(require_cloudflare=True, bot_block_enabled=False))
    assert guard.evaluate(_request({"user-agent": "Mozilla/5.0"}), "127.0.0.1").reason == "cloudflare_required"
    assert guard.evaluate(_request({"user-agent": "Mozilla/5.0", "cf-ray": "abc-SIN"}), "127.0.0.1").allowed is True


def test_edge_guard_blocks_ip_and_country() -> None:
    from app.security.edge_guard import EdgeGuard
    ip_guard = EdgeGuard(_edge_config(blocked_ip_cidrs=("203.0.113.0/24",), bot_block_enabled=False))
    assert ip_guard.evaluate(_request({"user-agent": "Mozilla/5.0"}), "203.0.113.9").reason == "ip_blocklisted"
    country_guard = EdgeGuard(_edge_config(blocked_countries=("US",), bot_block_enabled=False))
    assert country_guard.evaluate(_request({"user-agent": "Mozilla/5.0", "cf-ipcountry": "US"}), "127.0.0.1").reason == "country_blocked"
