# Local acceptance

## Preparation

1. Extract the ZIP so its root directly contains `backend`, `frontend`, `scripts`, `Dockerfile`, `render.yaml`, and `vercel.json`.
2. Run `Setup_Once.bat` once. It creates local dependencies that are intentionally absent from the ZIP.
3. Create `backend/.env` from `backend/.env.example`. Do not commit it.
4. For a no-SMTP local check, keep `APP_ENV=development`, `CLOUD_MODE=false`, `EMAIL_VERIFICATION_DEV_CODE_ENABLED=true`, and `PASSWORD_RESET_DEV_CODE_ENABLED=true`.

## Automated acceptance

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\Run-Local-Acceptance.ps1
```

This compiles the backend, runs `backend/tests/test_v45_delivery_acceptance.py`, and builds the frontend. It does not call Google, AI, SMTP, PayPal, Paddle or Stripe.

## Interactive local check

1. Run `Start_All.bat`.
2. Open `http://127.0.0.1:5173`.
3. Register with a disposable local test address. The one-time development code is shown and filled only in local development mode.
4. Confirm the email, sign out, sign in, request a password reset, complete it with the local code, and sign in with the new password.
5. Confirm Google displays “未配置” until `GOOGLE_CLIENT_ID` is filled.
6. Confirm OpenAI and DeepSeek each display “未配置” until the corresponding backend key is filled.
7. Upload a small TXT file, create a task, inspect its status and download a generated result when processing finishes.
8. Confirm `/api/payments/config` reports Sandbox and `live_checkout=false` before any payment acceptance.

## Real external checks after filling credentials

- SMTP: register a new address and request a password reset; verify both messages arrive.
- Google: use the popup and verify the returned account is created or signed in.
- OpenAI/DeepSeek: test each configured provider separately from the administrator provider page.
- PayPal: use Sandbox buyer and merchant accounts, then verify Checkout, Capture, webhook delivery, payment status and Credits. Never use a Live account in this stage.

## Stop

Run `Stop_All.bat`. The one-click launcher has bounded health waits and starts one backend and one frontend after clearing stale listeners on ports 8000 and 5173.
