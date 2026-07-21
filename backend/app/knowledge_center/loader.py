from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_json_directory(directory: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not directory.exists():
        return records
    for path in sorted(directory.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(payload, dict):
            payload.setdefault("id", path.stem)
            payload.setdefault("source_file", path.name)
            records.append(payload)
    return records
