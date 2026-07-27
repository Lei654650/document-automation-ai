from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import CONFIG

logger = logging.getLogger("document_automation_ai.security.audit")
_LOCK = threading.Lock()
_SENSITIVE_KEYS = {"password", "token", "secret", "api_key", "authorization", "cookie", "signature"}


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: ("***" if any(part in key.lower() for part in _SENSITIVE_KEYS) else _sanitize(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value[:50]]
    if isinstance(value, str) and len(value) > 500:
        return value[:500] + "…"
    return value


def _audit_path() -> Path:
    root = os.getenv("APP_DATA_DIR", "").strip()
    if root:
        base = Path(root).expanduser()
    elif os.name == "nt" and os.getenv("LOCALAPPDATA"):
        base = Path(os.environ["LOCALAPPDATA"]) / "DocumentAutomationAI"
    else:
        base = Path(__file__).resolve().parents[2]
    path = base / "logs" / "security_audit.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _rotate(path: Path) -> None:
    max_bytes = CONFIG.audit_log_max_mb * 1024 * 1024
    if path.exists() and path.stat().st_size >= max_bytes:
        backup = path.with_suffix(".jsonl.1")
        backup.unlink(missing_ok=True)
        path.replace(backup)


def audit_event(event: str, *, outcome: str = "success", ip: str = "", actor: str = "", request_id: str = "", details: dict[str, Any] | None = None) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "outcome": outcome,
        "ip": ip,
        "actor": actor,
        "request_id": request_id,
        "details": _sanitize(details or {}),
    }
    try:
        path = _audit_path()
        with _LOCK:
            _rotate(path)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    except OSError as exc:
        logger.warning("Unable to write security audit event %s: %s", event, exc)
