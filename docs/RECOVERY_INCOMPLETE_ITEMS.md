# Known incomplete items after recovery

This list records intentionally incomplete work. It is not a claim that these
features passed runtime acceptance.

## Payment cancellation UX

PayPal cancellation returns the user to the billing page through
`?payment=cancelled`. There is no dedicated cancellation page or complete
cancellation status card.

## Invoices

The wallet interface contains invoice wording and a placeholder action, but
invoice generation, storage and download are not complete.

## Paddle

The backend contains Paddle configuration, checkout and webhook framework.
End-to-end production onboarding, product/price synchronization and confirmed
production payment acceptance are not established in the recovered records.

## Stripe

The backend contains Stripe checkout/webhook framework. End-to-end production
configuration and confirmed production payment acceptance are not established
in the recovered records.

## PayPal acceptance status

PayPal Live code, checkout, capture, webhook, orders, wallet, credits and the
success flow are present. No real charge was performed during this recovery.
The optional one-dollar acceptance price is disabled by default.

## Runtime validation

Per the recovery instruction, this delivery has not started the backend,
connected to a database, called payment providers, or executed functional and
regression tests. Runtime testing must start only after approval.

