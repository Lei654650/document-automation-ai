# Online deployment

Version: Document Automation AI V46.0.0

## 1. Backend first

1. Create the Railway or Render backend service from the included deployment files.
2. Fill variables from `backend/.env.cloud.example`.
3. Keep both development-code flags false in production.
4. Configure durable storage at `/data` when the platform supports it.
5. Deploy and verify `/api/health`, `/api/readiness`, `/api/capabilities`, and `/api/public-config`.
6. Confirm the backend reports version `46.0.0`.

## 2. Frontend second

1. Import the frontend using `vercel.json`, or serve the built frontend from the backend.
2. When deploying separately, set `VITE_API_BASE_URL` to the verified backend origin.
3. Verify browser calls from `https://docai365.com` and `https://www.docai365.com`.
4. Set backend `PUBLIC_BASE_URL` and `CORS_ORIGINS` to the final frontend origins, then redeploy.

## 3. Identity and email

1. Configure SMTP variables and verify registration and password-reset messages.
2. Disable production development-code output.
3. Add the final domain as an authorized JavaScript origin in Google Cloud when Google login is enabled.
4. Verify a brand-new customer can register, verify email, sign in, sign out and reset the password on another computer.

## 4. AI providers

Fill OpenAI and/or DeepSeek variables. Select the active provider with `TRANSLATION_PROVIDER`. Test each provider separately with a short request before accepting document workloads.

## 5. Stripe

1. Complete the Stripe merchant review.
2. Enable card, Alipay and WeChat Pay when the account is eligible.
3. Configure `STRIPE_SECRET_KEY` and the three payment-method switches.
4. Create the webhook endpoint:

   ```text
   https://api.docai365.com/api/payments/stripe/webhook
   ```

5. Subscribe to:

   ```text
   checkout.session.completed
   checkout.session.async_payment_succeeded
   checkout.session.async_payment_failed
   checkout.session.expired
   invoice.paid
   invoice.payment_failed
   customer.subscription.deleted
   ```

6. Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
7. In Stripe test mode, verify card subscription checkout, Alipay prepaid checkout, WeChat Pay prepaid checkout, cancellation, asynchronous success/failure, webhook signature rejection, recurring invoice credit refresh and duplicate-event idempotency.
8. Repeat with small real payments before public release.

## 6. Rollback

Keep the previous deployment available until health checks, authentication, document tasks and all enabled payment methods pass. Roll back the deployment image or commit; never copy a production database into the local project.
