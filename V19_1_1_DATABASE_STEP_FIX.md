# V19.1.1 Database Step Initialization Fix

- Fixed `NOT NULL constraint failed: processing_steps.started_at` when a new processing job receives its first progress event.
- Pending steps are now reset with empty timestamps instead of SQL `NULL` values.
- Processing-step rows now explicitly initialize all non-null timing and message fields.
- Added regression coverage for job creation and the first transition into the validation/check stage.
