from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any


def is_serverless() -> bool:
    return bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


def storage_diagnostics(root: Path, database_path: Path, upload_dir: Path, output_dir: Path) -> dict[str, Any]:
    writable = True
    error = ""
    probe = root / ".write_probe"
    try:
        root.mkdir(parents=True, exist_ok=True)
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except Exception as exc:  # pragma: no cover - environment dependent
        writable = False
        error = str(exc)
    usage = shutil.disk_usage(root if root.exists() else Path(tempfile.gettempdir()))
    durable = bool(os.getenv("DATABASE_URL") or os.getenv("BLOB_READ_WRITE_TOKEN") or os.getenv("S3_BUCKET") or os.getenv("R2_BUCKET"))
    return {
        "root": str(root),
        "database_path": str(database_path),
        "upload_dir": str(upload_dir),
        "output_dir": str(output_dir),
        "writable": writable,
        "write_error": error,
        "serverless": is_serverless(),
        "durable_storage_configured": durable,
        "temporary_storage": is_serverless() and not durable,
        "free_mb": round(usage.free / 1024 / 1024, 1),
    }
