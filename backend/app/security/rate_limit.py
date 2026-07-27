from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from .config import CONFIG


class InMemoryRateLimiter:
    """Small, dependency-free fixed-window limiter suitable for one process.

    Edge/WAF limits remain the first line of defence in cloud production. This
    application limiter protects local and single-instance deployments too.
    """

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_cleanup = 0.0

    def allow(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if key not in self._events and len(self._events) >= CONFIG.limiter_max_buckets:
                self._cleanup(now, aggressive=True)
                if len(self._events) >= CONFIG.limiter_max_buckets:
                    # Fail closed for new identities when the limiter is saturated.
                    return False, window_seconds
            bucket = self._events[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            allowed = len(bucket) < limit
            if allowed:
                bucket.append(now)
            retry_after = max(1, int(window_seconds - (now - bucket[0]))) if bucket else 1
            if now - self._last_cleanup > 300:
                self._cleanup(now)
            return allowed, retry_after

    def _cleanup(self, now: float, aggressive: bool = False) -> None:
        ttl = 60 if aggressive else 3600
        stale = [key for key, bucket in self._events.items() if not bucket or now - bucket[-1] > ttl]
        for key in stale:
            self._events.pop(key, None)
        self._last_cleanup = now


rate_limiter = InMemoryRateLimiter()
