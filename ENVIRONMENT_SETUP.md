# Environment setup

Version: Document Automation AI V46.0.0

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

In production, disable `EMAIL_VERIFICATION_DEV_CODE_ENABLED` and `PASSWORD_RESET_DEV_CODE_ENABLED`. Production and cloud mode never return development codes.

## Google

Create a Google Identity Services web client. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the backend environment. Add the local and deployed frontend origins in Google Cloud. The frontend uses the Google Identity Services popup and sends the returned ID token to `/api/auth/google`.

## AI providers

Set `TRANSLATION_PROVIDER` to `openai`, `deepseek`, or `none`. OpenAI and DeepSeek profiles are independent, so both sets of variables may be prepared at once. Keys remain backend-only. If no key is present, capability and settings responses report only `configured=false`.

## Stripe payments

Stripe Checkout is the only production payment processor. Configure:

```env
PAYMENT_TEST_MODE=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CARD_ENABLED=true
STRIPE_ALIPAY_ENABLED=true
STRIPE_WECHAT_PAY_ENABLED=true
PAYMENT_SUCCESS_URL=https://docai365.com/?payment=success&payment_number={PAYMENT_NUMBER}&session_id={CHECKOUT_SESSION_ID}
PAYMENT_CANCEL_URL=https://docai365.com/?payment=cancelled
```

Webhook endpoint:

```text
https://api.docai365.com/api/payments/stripe/webhook
```

Subscribe to the events listed in `PAYMENT_SETUP_CN.md`. Payment method availability still depends on the Stripe account country, currency and Dashboard approval.

## Render / Railway

Use `render.yaml` or the corresponding Railway environment-variable panel. Secret values must be entered in the platform dashboard. The Docker service should use durable storage for `/data`. Set `PUBLIC_BASE_URL` to the frontend URL and `CORS_ORIGINS` to the comma-separated allowed frontend origins.

## Vercel

Use `vercel.json`. Set only the public build variable `VITE_API_BASE_URL` to the backend origin, without a trailing slash. Do not place backend secrets in Vercel frontend variables.

See `ENVIRONMENT_VARIABLES.md` and `PAYMENT_SETUP_CN.md` for the complete configuration.
