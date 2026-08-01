# Online deployment

Online deployment was not performed during this delivery preparation.

## 1. Render backend first

1. Create the Render service from `render.yaml` without changing the main branch during local acceptance.
2. Fill Render variables from `backend/.env.cloud.example`.
3. Keep `PAYPAL_MODE=sandbox`, `PAYPAL_LIVE_ENABLED=false`, and both development-code flags false.
4. Confirm the persistent disk is mounted at `/data`.
5. Deploy and verify `/api/health`, `/api/readiness`, `/api/capabilities`, and `/api/public-config`.

## 2. Vercel frontend second

1. Import the project with `vercel.json`.
2. Set `VITE_API_BASE_URL` to the verified Render backend origin.
3. Deploy and verify the browser can call the Render Health endpoint.
4. Set Render `PUBLIC_BASE_URL` and `CORS_ORIGINS` to the final Vercel/custom frontend origin, then redeploy the backend if required.

## 3. External identity and email

1. Configure SMTP variables in Render and verify registration and reset messages.
2. Add the Vercel/custom domain as an authorized JavaScript origin in Google Cloud.
3. Fill Google variables in Render and verify popup login/registration.

## 4. AI providers

Fill OpenAI and/or DeepSeek variables in Render. Select the active provider with `TRANSLATION_PROVIDER`. Test each provider separately with a short request before accepting document workloads.

## 5. PayPal Sandbox

1. Fill Sandbox credentials and webhook ID in Render.
2. Register `/api/payments/paypal/webhook` in the PayPal Sandbox app.
3. Use Sandbox buyer/merchant accounts only.
4. Verify Checkout, return Capture, webhook signature verification, order status, wallet and Credits exactly once.
5. Leave Live disabled. A separate explicit approval is required before setting both Live guard variables.

## 6. Paddle/Stripe

Configure only if the external product/price and webhook setup is complete. These providers are code-integrated but were not externally accepted in this stage.

## Rollback

Keep the previous Render/Vercel deployment available until Health, authentication, document tasks and Sandbox payments pass. Roll back the deployment image or commit; do not copy a production database into the local project.
