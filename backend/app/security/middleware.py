from __future__ import annotations

import logging
import secrets
import time
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from .audit import audit_event
from .config import CONFIG
from .rate_limit import rate_limiter
from .edge_guard import edge_guard

logger = logging.getLogger("document_automation_ai.security.middleware")


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, allowed_origins: list[str] | None = None) -> None:
        super().__init__(app)
        self.allowed_origins = {origin.rstrip("/") for origin in (allowed_origins or []) if origin and origin != "*"}

    @staticmethod
    def _client_ip(request: Request) -> str:
        if CONFIG.trust_proxy_headers:
            forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
            if forwarded:
                return forwarded
        return request.client.host if request.client else "unknown"

    @staticmethod
    def _limit_for(path: str) -> tuple[str, int]:
        if path == "/api/auth/login":
            return "login", CONFIG.login_requests_per_minute
        if path.startswith("/api/auth/"):
            return "auth", CONFIG.auth_requests_per_minute
        if path.startswith("/api/uploads") or path == "/api/orders":
            return "upload", CONFIG.upload_requests_per_minute
        if path.startswith("/api/payments") or path.startswith("/api/credits"):
            return "payment", CONFIG.payment_requests_per_minute
        return "general", CONFIG.general_requests_per_minute

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not CONFIG.enabled:
            return await call_next(request)
        request_id = request.headers.get("x-request-id", "").strip()[:128] or secrets.token_hex(12)
        request.state.request_id = request_id
        ip = self._client_ip(request)
        path = request.url.path

        edge = edge_guard.evaluate(request, ip)
        if not edge.allowed:
            audit_event("edge.blocked", outcome="blocked", ip=ip, request_id=request_id, details={"path": path, "reason": edge.reason, "country": edge.country})
            return JSONResponse(
                status_code=403,
                content={"detail": "Request blocked by the security policy.", "request_id": request_id},
                headers={"X-Request-ID": request_id},
            )

        bucket, limit = self._limit_for(path)
        allowed, retry_after = rate_limiter.allow(f"{bucket}:{ip}", limit, 60)
        if not allowed:
            audit_event("rate_limit.blocked", outcome="blocked", ip=ip, request_id=request_id, details={"path": path, "bucket": bucket})
            return JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later.", "request_id": request_id}, headers={"Retry-After": str(retry_after), "X-Request-ID": request_id})

        content_length = request.headers.get("content-length", "")
        if content_length.isdigit() and int(content_length) > CONFIG.request_body_limit_mb * 1024 * 1024:
            return JSONResponse(status_code=413, content={"detail": "Request body is too large.", "request_id": request_id}, headers={"X-Request-ID": request_id})

        origin = request.headers.get("origin", "").rstrip("/")
        if origin and request.method not in {"GET", "HEAD", "OPTIONS"} and self.allowed_origins and origin not in self.allowed_origins:
            audit_event("origin.blocked", outcome="blocked", ip=ip, request_id=request_id, details={"path": path, "origin": origin})
            return JSONResponse(status_code=403, content={"detail": "Request origin is not allowed.", "request_id": request_id}, headers={"X-Request-ID": request_id})

        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled request error request_id=%s path=%s", request_id, path)
            raise
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(self)"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
            "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; "
            "connect-src 'self' https: wss:; frame-src https://accounts.google.com; worker-src 'self' blob:"
        )
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto", "").lower() == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers.setdefault("Cache-Control", "no-store" if path.startswith("/api/auth") or path.startswith("/api/admin") else "private, no-cache")

        if path.startswith(("/api/auth/", "/api/admin/", "/api/payments/")) and request.method not in {"GET", "HEAD", "OPTIONS"}:
            audit_event("http.security_sensitive", outcome="success" if response.status_code < 400 else "failure", ip=ip, request_id=request_id, details={"method": request.method, "path": path, "status": response.status_code, "duration_ms": round((time.perf_counter() - started) * 1000, 2)})
        return response
