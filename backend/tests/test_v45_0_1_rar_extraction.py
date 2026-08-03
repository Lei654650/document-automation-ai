from __future__ import annotations

import struct
import zlib
from pathlib import Path
from types import SimpleNamespace

from app import main


def _fake_which(mapping: dict[str, str | None]):
    valid_paths = {item for item in mapping.values() if item}

    def fake(value: str) -> str | None:
        if value in mapping:
            return mapping[value]
        if value.startswith("/") or ":\\" in value:
            return value if value in valid_paths else None
        return None

    return fake


def _clear_rar_env(monkeypatch) -> None:
    for variable in (
        "DAI_UNRAR_PATH",
        "DAI_UNAR_PATH",
        "DAI_7ZIP_PATH",
        "SEVENZIP_PATH",
        "DAI_WINRAR_PATH",
        "WINRAR_PATH",
    ):
        monkeypatch.delenv(variable, raising=False)


def _write_stored_rar(path: Path) -> None:
    """Create a tiny valid RAR3 archive using the store method."""

    def header(body: bytes) -> bytes:
        return struct.pack("<H", zlib.crc32(body) & 0xFFFF) + body

    name = b"hello.txt"
    data = b"hello rar\n"
    main_body = struct.pack("<BHHHI", 0x73, 0x0000, 13, 0, 0)
    file_body = (
        struct.pack("<BHH", 0x74, 0x8000, 32 + len(name))
        + struct.pack("<II", len(data), len(data))
        + struct.pack("<B", 3)
        + struct.pack("<I", zlib.crc32(data) & 0xFFFFFFFF)
        + struct.pack("<I", 0)
        + struct.pack("<B", 20)
        + struct.pack("<B", 0x30)
        + struct.pack("<H", len(name))
        + struct.pack("<I", 0x20)
        + name
    )
    end_body = struct.pack("<BHH", 0x7B, 0x0000, 7)
    path.write_bytes(b"Rar!\x1a\x07\x00" + header(main_body) + header(file_body) + data + header(end_body))


def test_plain_tar_is_never_selected_as_rar_extractor(monkeypatch) -> None:
    _clear_rar_env(monkeypatch)
    monkeypatch.setattr(main.shutil, "which", _fake_which({"tar": "/usr/bin/tar"}))

    assert main._classify_rar_extractor("/usr/bin/tar") is None
    assert main._find_rar_extractors() == []
    assert main._find_rar_extractor() is None


def test_tar_environment_override_is_rejected(monkeypatch) -> None:
    _clear_rar_env(monkeypatch)
    monkeypatch.setenv("DAI_UNRAR_PATH", "/usr/bin/tar")
    monkeypatch.setattr(main.shutil, "which", _fake_which({"/usr/bin/tar": "/usr/bin/tar"}))

    assert main._find_rar_extractors() == []


def test_unar_is_preferred_and_bsdtar_is_available_as_fallback(monkeypatch) -> None:
    _clear_rar_env(monkeypatch)
    monkeypatch.setattr(
        main.shutil,
        "which",
        _fake_which(
            {
                "unar": "/usr/bin/unar",
                "/usr/bin/unar": "/usr/bin/unar",
                "bsdtar": "/usr/bin/bsdtar",
                "/usr/bin/bsdtar": "/usr/bin/bsdtar",
            }
        ),
    )

    assert main._find_rar_extractors() == [
        ("unar", "/usr/bin/unar"),
        ("bsdtar", "/usr/bin/bsdtar"),
    ]
    assert main._find_rar_extractor() == ("unar", "/usr/bin/unar")


def test_external_rar_extraction_uses_bsdtar(monkeypatch, tmp_path: Path) -> None:
    archive = tmp_path / "普通压缩包.rar"
    archive.write_bytes(b"RAR placeholder")
    destination = tmp_path / "expanded"
    observed: list[str] = []

    monkeypatch.setattr(main, "_find_rar_extractors", lambda: [("bsdtar", "/usr/bin/bsdtar")])

    def fake_run(command, **_kwargs):
        observed.extend(command)
        staging = Path(command[command.index("-C") + 1])
        nested = staging / "中文目录"
        nested.mkdir(parents=True)
        (nested / "文字标签.txt").write_text("ok", encoding="utf-8")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run)
    output = main._extract_rar_external(archive, destination)

    assert observed[:2] == ["/usr/bin/bsdtar", "-xf"]
    assert "/usr/bin/tar" not in observed
    assert [item.relative_to(destination).as_posix() for item in output] == ["中文目录/文字标签.txt"]
    assert output[0].read_text(encoding="utf-8") == "ok"


def test_external_rar_extraction_falls_back_to_next_tool(monkeypatch, tmp_path: Path) -> None:
    archive = tmp_path / "normal.rar"
    archive.write_bytes(b"RAR placeholder")
    destination = tmp_path / "expanded"
    calls: list[str] = []

    monkeypatch.setattr(
        main,
        "_find_rar_extractors",
        lambda: [("7z", "/usr/bin/7z"), ("unar", "/usr/bin/unar")],
    )

    def fake_run(command, **_kwargs):
        calls.append(command[0])
        if command[0].endswith("7z"):
            return SimpleNamespace(returncode=2, stdout="", stderr="Unsupported Method")
        staging = Path(command[command.index("-o") + 1])
        staging.mkdir(parents=True, exist_ok=True)
        (staging / "file.txt").write_text("ok", encoding="utf-8")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(main.subprocess, "run", fake_run)
    output = main._extract_rar_external(archive, destination)

    assert calls == ["/usr/bin/7z", "/usr/bin/unar"]
    assert output[0].read_text(encoding="utf-8") == "ok"


def test_real_stored_rar_is_extracted(tmp_path: Path) -> None:
    archive = tmp_path / "stored.rar"
    destination = tmp_path / "expanded"
    _write_stored_rar(archive)

    output = main._extract_rar(archive, destination)

    assert [item.name for item in output] == ["hello.txt"]
    assert output[0].read_bytes() == b"hello rar\n"


def test_rar_error_messages_are_specific() -> None:
    assert "加密" in main._rar_failure_detail("Encrypted file, wrong password")
    assert "损坏" in main._rar_failure_detail("CRC failed: archive corrupt")
    assert "不受" in main._rar_failure_detail("Unsupported compression method")
