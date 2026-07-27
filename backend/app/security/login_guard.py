from __future__ import annotations

import hashlib
import threading
import time
from dataclasses import dataclass

from .config import CONFIG


@dataclass
class _LoginState:
    failures: list[float]
    locked_until: float = 0.0


class LoginGuard:
    def __init__(self) -> None:
        self._states: dict[str, _LoginState] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _key(email: str, ip: str) -> str:
        value = f"{email.strip().lower()}|{ip.strip()}".encode("utf-8", "ignore")
        return hashlib.sha256(value).hexdigest()

    def check(self, email: str, ip: str) -> int:
        now = time.time()
        key = self._key(email, ip)
        with self._lock:
            state = self._states.get(key)
            if state is None:
                return 0
            if state.locked_until > now:
                return max(1, int(state.locked_until - now))
            cutoff = now - CONFIG.login_window_seconds
            state.failures = [stamp for stamp in state.failures if stamp > cutoff]
            if not state.failures:
                self._states.pop(key, None)
            return 0

    def failure(self, email: str, ip: str) -> int:
        now = time.time()
        key = self._key(email, ip)
        with self._lock:
            if key not in self._states and len(self._states) >= CONFIG.login_guard_max_entries:
                self._cleanup(now)
                if len(self._states) >= CONFIG.login_guard_max_entries:
                    # Avoid unbounded memory growth under distributed credential attacks.
                    return CONFIG.login_lock_seconds
            state = self._states.setdefault(key, _LoginState(failures=[]))
            cutoff = now - CONFIG.login_window_seconds
            state.failures = [stamp for stamp in state.failures if stamp > cutoff]
            state.failures.append(now)
            if len(state.failures) >= CONFIG.login_max_failures:
                state.locked_until = now + CONFIG.login_lock_seconds
                state.failures.clear()
                return CONFIG.login_lock_seconds
            return 0

    def _cleanup(self, now: float) -> None:
        cutoff = now - max(CONFIG.login_window_seconds, CONFIG.login_lock_seconds)
        stale = [key for key, state in self._states.items() if state.locked_until <= now and (not state.failures or max(state.failures) <= cutoff)]
        for key in stale:
            self._states.pop(key, None)

    def success(self, email: str, ip: str) -> None:
        with self._lock:
            self._states.pop(self._key(email, ip), None)


login_guard = LoginGuard()
