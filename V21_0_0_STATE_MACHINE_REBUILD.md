# V21.0.0 Unified Processing State Machine

- One authoritative terminal state: completed, partial_completed, failed, or quality_review.
- Zero successful outputs can never be shown as completed.
- Failure details stay in structured API data; error_report.txt is no longer a customer deliverable.
- Delivery count equals real downloadable files only.
- Delivery ZIP controls are hidden when there are no successful files.
- Frontend success/failure totals use backend authoritative counts.
