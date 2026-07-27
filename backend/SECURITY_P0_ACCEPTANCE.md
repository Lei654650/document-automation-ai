# V41.0.1 Enterprise Security P0 Acceptance

## Scope

This delivery changes only the backend security module and its minimal integration points.
Frontend, startup scripts, runtime folder, user data, databases, API keys and payment credentials are not included.

## Completed controls

1. Per-IP API rate limiting with separate login, authentication, upload and payment buckets.
2. Login brute-force protection with temporary lockout and bounded in-memory state.
3. Upload extension validation, content signature validation and Office structure validation.
4. Archive safety checks for traversal paths, scripts/executables, encryption, macro payloads, excessive member counts, expansion size and compression-ratio bombs.
5. Security response headers, request IDs, request-body size limits and origin checks.
6. Production configuration checks for administrator password, authentication secret and placeholder API credentials.
7. Verified PayPal, Paddle and Stripe webhook signature flows plus duplicate-event rejection.
8. Sanitized JSONL security audit logging with size rotation.

## Automated acceptance

- Python compilation: PASS
- Security unit tests: 10/10 PASS
- FastAPI application import: PASS
- Startup and database initialization: PASS
- `/api/health`: HTTP 200 PASS
- CSP, X-Frame-Options, X-Content-Type-Options and X-Request-ID: PASS

## Environment requirements for production

Set `SECURITY_STRICT_STARTUP=true`, a random `AUTH_SECRET` of at least 32 characters, a long unique `ADMIN_PASSWORD`, the exact production `CORS_ORIGINS`, and valid payment webhook secrets.

Cloudflare/WAF rules are an infrastructure-layer task and are not silently configured by backend code.
