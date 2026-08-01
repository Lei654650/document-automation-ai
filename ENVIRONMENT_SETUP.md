# Environment setup

Version: Document Automation AI V45.0.0 Recovered

Never place populated environment files in Git or in a delivery archive. The repository contains templates only.

## Local Windows

1. Copy `backend/.env.example` to `backend/.env` after extracting the project.
2. Generate a long random `AUTH_SECRET`.
3. Set `OWNER_EMAIL` to the account that should receive owner permissions.
4. Keep `APP_ENV=development`, `CLOUD_MODE=false`, and `APP_DATA_DIR=../.runtime`.
5. Without SMTP, keep both local development-code flags enabled. Codes are returned only when the backend is both local and in development mode.
6. Leave `frontend/.env` absent or keep `VITE_API_BASE_URL` blank. Vite proxies `/api` to `http://127.0.0.1:8000`.

## SMTP

Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL` in the backend environment. Choose exactly one transport:

- STARTTLS: `SMTP_USE_TLS=true`, `SMTP_USE_SSL=false`, commonly port 587.
- Implicit SSL: `SMTP_USE_TLS=false`, `SMTP_USE_SSL=true`, commonly port 465.

In Render, disable `EMAIL_VERIFICATION_DEV_CODE_ENABLED` and `PASSWORD_RESET_DEV_CODE_ENABLED`. Production and cloud mode never return development codes.

## Google

Create a Google Identity Services web client. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in Render. Add the local and deployed frontend origins in Google Cloud. The current frontend uses the Google Identity Services popup and sends the returned ID token to `/api/auth/google`.

## AI providers

Set `TRANSLATION_PROVIDER` to `openai`, `deepseek`, or `none`. OpenAI and DeepSeek profiles are independent, so both sets of variables may be prepared at once. Keys remain backend-only. If no key is present, capability and settings responses report only `configured=false`.

## PayPal Sandbox

Keep `PAYPAL_MODE=sandbox` and `PAYPAL_LIVE_ENABLED=false`. Fill the Sandbox `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` in Render. Configure the webhook URL as:

`https://<render-backend>/api/payments/paypal/webhook`

Live is guarded by both `PAYPAL_MODE=live` and `PAYPAL_LIVE_ENABLED=true`. Do not enable either during Sandbox acceptance.

## Paddle and Stripe

The backend has checkout/webhook integration points for both. Their variables are optional and must be filled only after the corresponding external products, prices and webhook endpoints exist. Paddle takes provider priority when both its API key and price map are configured.

## Render

Use `render.yaml`. Secret values are marked `sync: false`; enter them in the Render dashboard. The Docker service mounts persistent storage at `/data`. Set `PUBLIC_BASE_URL` to the frontend URL and `CORS_ORIGINS` to the comma-separated allowed frontend origins.

## Vercel

Use `vercel.json`. Set only the public build variable `VITE_API_BASE_URL` to the Render backend origin, without a trailing slash. Do not place backend secrets in Vercel frontend variables.

See `ENVIRONMENT_VARIABLES.md` for the complete variable inventory.
