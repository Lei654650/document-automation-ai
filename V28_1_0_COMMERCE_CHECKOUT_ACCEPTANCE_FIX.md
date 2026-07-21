# V28.1.0 Commerce Checkout Acceptance Fix

## Fixed
1. The selected-plan confirmation button now creates a Demo order when real credentials are absent.
2. Demo checkout redirects back to the frontend, confirms payment, credits the wallet, and issues a License.
3. Loading and visible error messages prevent silent failures.
4. PayPal-only copy was replaced with provider-neutral Commerce Hub wording.
5. Pricing comparison received clearer SaaS visual hierarchy and hover feedback.
6. Dashboard wording now says processing records, not real payment orders.
7. Dashboard total is read from the database rather than the visible five-row list.

## Acceptance path
Select Professional -> enter name/email -> Start Demo acceptance -> automatic confirmation -> wallet shows credits -> License stored in database.
