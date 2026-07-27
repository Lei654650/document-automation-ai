from __future__ import annotations

import threading
import time

from .config import CONFIG


class WebhookReplayGuard:
    def __init__(self) -> None:
        self._seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def accept(self, provider: str, event_id: str) -> bool:
        if not event_id:
            return True
        now = time.time()
        key = f"{provider}:{event_id}"
        with self._lock:
            cutoff = now - CONFIG.webhook_replay_ttl_seconds
            for stale in [item for item, stamp in self._seen.items() if stamp < cutoff]:
                self._seen.pop(stale, None)
            if key in self._seen:
                return False
            self._seen[key] = now
            return True


webhook_replay_guard = WebhookReplayGuard()
