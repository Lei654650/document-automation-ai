from __future__ import annotations

import os
from dataclasses import dataclass


def _int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.getenv(name, str(default))))
    except (TypeError, ValueError):
        return default


def _csv(name: str) -> tuple[str, ...]:
    return tuple(item.strip().upper() for item in os.getenv(name, "").split(",") if item.strip())


def _bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SecurityConfig:
    enabled: bool = _bool("SECURITY_ENABLED", True)
    trust_proxy_headers: bool = _bool("SECURITY_TRUST_PROXY_HEADERS", True)
    strict_startup: bool = _bool("SECURITY_STRICT_STARTUP", False)
    request_body_limit_mb: int = _int("SECURITY_REQUEST_BODY_LIMIT_MB", 512)
    general_requests_per_minute: int = _int("SECURITY_GENERAL_RPM", 240)
    auth_requests_per_minute: int = _int("SECURITY_AUTH_RPM", 20)
    login_requests_per_minute: int = _int("SECURITY_LOGIN_RPM", 10)
    upload_requests_per_minute: int = _int("SECURITY_UPLOAD_RPM", 60)
    payment_requests_per_minute: int = _int("SECURITY_PAYMENT_RPM", 30)
    login_max_failures: int = _int("SECURITY_LOGIN_MAX_FAILURES", 5)
    login_window_seconds: int = _int("SECURITY_LOGIN_WINDOW_SECONDS", 900)
    login_lock_seconds: int = _int("SECURITY_LOGIN_LOCK_SECONDS", 900)
    webhook_replay_ttl_seconds: int = _int("SECURITY_WEBHOOK_REPLAY_TTL_SECONDS", 86400)
    audit_log_max_mb: int = _int("SECURITY_AUDIT_LOG_MAX_MB", 20)
    archive_max_members: int = _int("SECURITY_ARCHIVE_MAX_MEMBERS", 1000)
    archive_max_uncompressed_mb: int = _int("SECURITY_ARCHIVE_MAX_UNCOMPRESSED_MB", 1024)
    archive_max_ratio: int = _int("SECURITY_ARCHIVE_MAX_RATIO", 200)
    limiter_max_buckets: int = _int("SECURITY_LIMITER_MAX_BUCKETS", 50000)
    login_guard_max_entries: int = _int("SECURITY_LOGIN_GUARD_MAX_ENTRIES", 50000)
    bot_block_enabled: bool = _bool("SECURITY_BOT_BLOCK_ENABLED", True)
    require_cloudflare: bool = _bool("SECURITY_REQUIRE_CLOUDFLARE", False)
    blocked_ip_cidrs: tuple[str, ...] = _csv("SECURITY_BLOCKED_IPS")
    allowed_ip_cidrs: tuple[str, ...] = _csv("SECURITY_ALLOWED_IPS")
    blocked_countries: tuple[str, ...] = _csv("SECURITY_BLOCKED_COUNTRIES")
    allowed_countries: tuple[str, ...] = _csv("SECURITY_ALLOWED_COUNTRIES")


CONFIG = SecurityConfig()
