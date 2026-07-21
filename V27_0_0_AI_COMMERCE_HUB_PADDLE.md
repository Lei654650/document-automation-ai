# V27.0.0 AI Commerce Hub + Paddle

## Purpose
Document Automation AI creates the order, sends the customer to Paddle Checkout, and receives a signed webhook after payment. Paddle handles the actual payment and tax workflow; the application handles orders, credits, and access.

## Required environment variables

```env
PADDLE_ENV=sandbox
PADDLE_API_KEY=pdl_sdbx_apikey_xxx
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
PADDLE_CHECKOUT_URL=https://your-approved-domain.example/
PADDLE_PRICE_MAP={"starter_monthly":"pri_xxx","starter_yearly":"pri_xxx","professional_monthly":"pri_xxx","professional_yearly":"pri_xxx","business_monthly":"pri_xxx","business_yearly":"pri_xxx","credits_1000":"pri_xxx","credits_5000":"pri_xxx","credits_20000":"pri_xxx"}
```

Webhook URL:

```text
https://your-domain.example/api/payments/paddle/webhook
```

Subscribe at minimum to `transaction.completed`.

## Safety
- The application never stores card details.
- Webhooks are verified with HMAC-SHA256 and a five-minute tolerance.
- Credit grants remain idempotent through the existing paid-status check.
