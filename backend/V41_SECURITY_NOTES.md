# V41.0.0 Enterprise Security P0

Localized backend-only security upgrade.

## Added
- Per-IP API rate limiting with separate auth, login, upload and payment limits.
- Login brute-force lockout after repeated failures.
- Upload content validation for PDF, images and ZIP-based Office documents.
- Security headers, request IDs, origin checks and request body limits.
- Startup checks for unsafe production secrets and default administrator passwords.
- Payment webhook replay protection after provider signature verification.
- Structured security audit log at `logs/security_audit.jsonl`.
- Environment switches documented in `.env.example` and `.env.cloud.example`.

## Localized changes
- Added `app/security/`.
- Minimal integration changes in `app/main.py`.
- No frontend, startup script, OCR, translation or document-processing engine changes.

## Replacement
Copy the contents of this `backend` folder over the existing known-good backend folder. Do not delete the existing `.venv` or `.env`; they are intentionally excluded from this delivery.
