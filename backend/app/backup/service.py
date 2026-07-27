from __future__ import annotations

import json
import os
import shutil
import sqlite3
import tempfile
import threading
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

_LOCK = threading.RLock()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_size(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(max(0, size))
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


class BackupService:
    def __init__(self, *, base_dir: Path, persistent_root: Path, db_path: Path):
        self.base_dir = base_dir.resolve()
        self.persistent_root = persistent_root.resolve()
        self.db_path = db_path.resolve()
        self.backup_dir = (self.persistent_root / "backups").resolve()
        self.policy_path = self.backup_dir / "policy.json"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def default_policy(self) -> dict:
        return {"enabled": True, "frequency": "daily", "retention": 14, "last_run_at": None}

    def get_policy(self) -> dict:
        policy = self.default_policy()
        if self.policy_path.exists():
            try:
                value = json.loads(self.policy_path.read_text(encoding="utf-8"))
                if isinstance(value, dict):
                    policy.update(value)
            except (OSError, json.JSONDecodeError):
                pass
        policy["retention"] = min(90, max(1, int(policy.get("retention", 14))))
        policy["frequency"] = policy.get("frequency") if policy.get("frequency") in {"daily", "weekly"} else "daily"
        policy["enabled"] = bool(policy.get("enabled", True))
        return policy

    def save_policy(self, policy: dict) -> dict:
        current = self.get_policy()
        current.update({
            "enabled": bool(policy.get("enabled", current["enabled"])),
            "frequency": policy.get("frequency", current["frequency"]),
            "retention": min(90, max(1, int(policy.get("retention", current["retention"])))),
        })
        if current["frequency"] not in {"daily", "weekly"}:
            raise ValueError("frequency must be daily or weekly")
        self._write_json_atomic(self.policy_path, current)
        return current

    def _write_json_atomic(self, path: Path, value: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, path)

    def _sqlite_snapshot(self, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            return
        source = sqlite3.connect(str(self.db_path), timeout=30)
        target = sqlite3.connect(str(destination), timeout=30)
        try:
            source.backup(target)
        finally:
            target.close()
            source.close()

    def _candidate_files(self) -> Iterable[tuple[Path, str]]:
        data_dir = self.persistent_root / "data"
        if data_dir.exists():
            for path in data_dir.rglob("*"):
                if path.is_file() and path.resolve() != self.db_path:
                    yield path, f"data/{path.relative_to(data_dir).as_posix()}"
        for rel in ("app/knowledge_center", "app/config", "app/settings"):
            root = self.base_dir / rel
            if root.exists():
                for path in root.rglob("*"):
                    if path.is_file() and "__pycache__" not in path.parts:
                        yield path, f"project/{path.relative_to(self.base_dir).as_posix()}"
        for name in (".env.example", ".env.cloud.example"):
            path = self.base_dir / name
            if path.exists():
                yield path, f"project/{name}"

    def create_backup(self, *, backup_type: str = "manual", note: str = "", created_by: str = "system") -> dict:
        if backup_type not in {"manual", "automatic", "pre_restore"}:
            raise ValueError("Invalid backup type")
        with _LOCK:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
            backup_id = f"backup_{timestamp}"
            final_path = self.backup_dir / f"{backup_id}.zip"
            with tempfile.TemporaryDirectory(prefix="dai_backup_") as tmp_dir:
                tmp_root = Path(tmp_dir)
                db_snapshot = tmp_root / "database" / "orders.db"
                self._sqlite_snapshot(db_snapshot)
                included = []
                manifest = {
                    "schema_version": 1,
                    "backup_id": backup_id,
                    "created_at": utc_now(),
                    "created_by": created_by,
                    "type": backup_type,
                    "note": note[:500],
                    "app": "Document Automation AI",
                    "included": included,
                }
                with zipfile.ZipFile(final_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
                    if db_snapshot.exists():
                        archive.write(db_snapshot, "database/orders.db")
                        included.append("database")
                    seen = set()
                    for source, arcname in self._candidate_files():
                        if arcname in seen:
                            continue
                        seen.add(arcname)
                        archive.write(source, arcname)
                    if seen:
                        included.extend(["configuration", "knowledge"])
                    archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
            info = self.get_backup(backup_id)
            self.enforce_retention()
            return info

    def _read_manifest(self, path: Path) -> dict:
        with zipfile.ZipFile(path, "r") as archive:
            try:
                return json.loads(archive.read("manifest.json").decode("utf-8"))
            except (KeyError, json.JSONDecodeError, UnicodeDecodeError):
                return {}

    def get_backup(self, backup_id: str) -> dict:
        path = self._path_for_id(backup_id)
        if not path.exists():
            raise FileNotFoundError(backup_id)
        manifest = self._read_manifest(path)
        stat = path.stat()
        return {
            "id": backup_id,
            "filename": path.name,
            "created_at": manifest.get("created_at") or datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            "created_by": manifest.get("created_by", "system"),
            "type": manifest.get("type", "manual"),
            "note": manifest.get("note", ""),
            "included": manifest.get("included", []),
            "size_bytes": stat.st_size,
            "size_display": format_size(stat.st_size),
            "status": "ready",
        }

    def list_backups(self) -> list[dict]:
        result = []
        for path in self.backup_dir.glob("backup_*.zip"):
            try:
                result.append(self.get_backup(path.stem))
            except (OSError, zipfile.BadZipFile):
                result.append({"id": path.stem, "filename": path.name, "created_at": None, "size_bytes": path.stat().st_size, "size_display": format_size(path.stat().st_size), "status": "damaged", "type": "unknown", "note": "", "included": []})
        return sorted(result, key=lambda item: item.get("created_at") or "", reverse=True)

    def _path_for_id(self, backup_id: str) -> Path:
        if not backup_id.startswith("backup_") or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_" for ch in backup_id):
            raise ValueError("Invalid backup id")
        return self.backup_dir / f"{backup_id}.zip"

    def delete_backup(self, backup_id: str) -> None:
        path = self._path_for_id(backup_id)
        if not path.exists():
            raise FileNotFoundError(backup_id)
        path.unlink()

    def restore_backup(self, backup_id: str, *, restored_by: str) -> dict:
        path = self._path_for_id(backup_id)
        if not path.exists():
            raise FileNotFoundError(backup_id)
        with _LOCK:
            safety = self.create_backup(backup_type="pre_restore", note=f"Automatic safety backup before restoring {backup_id}", created_by=restored_by)
            with zipfile.ZipFile(path, "r") as archive:
                names = set(archive.namelist())
                if "manifest.json" not in names:
                    raise ValueError("Backup manifest is missing")
                if "database/orders.db" in names:
                    self.db_path.parent.mkdir(parents=True, exist_ok=True)
                    temp_db = self.db_path.with_suffix(".restore.tmp")
                    with archive.open("database/orders.db") as source, temp_db.open("wb") as target:
                        shutil.copyfileobj(source, target)
                    check = sqlite3.connect(str(temp_db))
                    try:
                        row = check.execute("PRAGMA integrity_check").fetchone()
                        if not row or row[0] != "ok":
                            raise ValueError("Backup database integrity check failed")
                    finally:
                        check.close()
                    os.replace(temp_db, self.db_path)
                for name in names:
                    if not name.startswith("data/") or name.endswith("/"):
                        continue
                    relative = Path(name).relative_to("data")
                    if ".." in relative.parts:
                        raise ValueError("Unsafe backup path")
                    destination = (self.persistent_root / "data" / relative).resolve()
                    if self.persistent_root not in destination.parents:
                        raise ValueError("Unsafe restore destination")
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    temp = destination.with_suffix(destination.suffix + ".restore.tmp")
                    with archive.open(name) as source, temp.open("wb") as target:
                        shutil.copyfileobj(source, target)
                    os.replace(temp, destination)
            return {"restored": True, "backup_id": backup_id, "safety_backup": safety, "restored_at": utc_now()}

    def enforce_retention(self) -> None:
        retention = self.get_policy()["retention"]
        backups = [item for item in self.list_backups() if item.get("type") == "automatic"]
        for item in backups[retention:]:
            try:
                self.delete_backup(item["id"])
            except OSError:
                pass
