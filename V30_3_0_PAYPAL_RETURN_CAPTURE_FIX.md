# V30.3 PayPal Return Capture Fix

- Detect PayPal return parameters globally and open the payment center automatically.
- Capture approved PayPal orders using the PayPal order token alone.
- Resolve the local payment order from `provider_session_id`, avoiding reliance on editable return URL query parameters.
- Preserve idempotency: repeated returns do not add credits or licenses twice.
- Display an explicit payment-success modal with payment number, plan and credited amount.
- Refresh the authenticated user's wallet after capture.
