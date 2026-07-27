from __future__ import annotations

import threading
from datetime import datetime, timezone

from .service import BackupService

_STARTED = False
_LOCK = threading.Lock()


def _due(policy: dict) -> bool:
    last = policy.get("last_run_at")
    if not last:
        return True
    try:
        elapsed = datetime.now(timezone.utc) - datetime.fromisoformat(last)
    except (TypeError, ValueError):
        return True
    seconds = 7 * 86400 if policy.get("frequency") == "weekly" else 86400
    return elapsed.total_seconds() >= seconds


def start_backup_scheduler(service: BackupService) -> None:
    global _STARTED
    with _LOCK:
        if _STARTED:
            return
        _STARTED = True

    def run() -> None:
        while True:
            try:
                policy = service.get_policy()
                if policy.get("enabled") and _due(policy):
                    service.create_backup(backup_type="automatic", note="Scheduled automatic backup", created_by="scheduler")
                    policy["last_run_at"] = datetime.now(timezone.utc).isoformat()
                    service._write_json_atomic(service.policy_path, policy)
            except Exception:
                pass
            threading.Event().wait(3600)

    threading.Thread(target=run, name="dai-backup-scheduler", daemon=True).start()
