from __future__ import annotations

import logging
import os

logger = logging.getLogger("document_automation_ai.security.configuration")
_PLACEHOLDERS = {"", "changeme", "change-me", "admin123456", "secret", "your-api-key", "sk-test"}


def validate_security_configuration(*, cloud_mode: bool, admin_password: str, auth_secret: str, strict: bool = False) -> list[str]:
    issues: list[str] = []
    if cloud_mode and admin_password.strip().lower() in _PLACEHOLDERS:
        issues.append("ADMIN_PASSWORD is missing or uses a default value")
    if cloud_mode and (not auth_secret or len(auth_secret) < 32):
        issues.append("AUTH_SECRET must be a stable random value of at least 32 characters")
    for name in ("STRIPE_SECRET_KEY", "PAYPAL_CLIENT_SECRET", "PADDLE_API_KEY", "GOOGLE_CLIENT_SECRET"):
        value = os.getenv(name, "").strip()
        if value and value.lower() in _PLACEHOLDERS:
            issues.append(f"{name} contains a placeholder value")
    if issues:
        message = "; ".join(issues)
        if strict:
            raise RuntimeError(f"Unsafe production security configuration: {message}")
        logger.warning("Security configuration warning: %s", message)
    return issues
