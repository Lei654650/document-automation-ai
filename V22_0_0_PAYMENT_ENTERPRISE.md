# Document Automation AI V22.0.0 Enterprise

## Payment module
- Starter ($19 / 1,000 credits), Professional ($59 / 5,000 credits), Enterprise ($199 / 25,000 credits).
- Payment-order database and event audit trail.
- Stripe Checkout Sessions integration.
- Signed Stripe webhook processing and idempotent fulfillment.
- Demo payment mode for local acceptance without real charges.
- Public payment status endpoint and administrator transaction endpoint.
- Chinese, English and Vietnamese payment center.

## Production setup
Set PAYMENT_TEST_MODE=false, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and PUBLIC_BASE_URL. Register `/api/payments/stripe/webhook` as the Stripe webhook endpoint.
