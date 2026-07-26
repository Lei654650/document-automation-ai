# V35.1.0 Progress Pipeline Fix

- Root cause confirmed from production logs: scan, translation and XLSX writing finished in under two seconds, but the synchronous progress callback blocked for 200–280 seconds before local post-processing continued.
- Progress persistence is now handled by one bounded background writer per job.
- Document processing no longer waits for SQLite progress/event writes while the browser polls `/api/track`.
- Duplicate progress events are coalesced to reduce database writes for large batch projects.
- Pause/cancel checks remain synchronous, so task control stays responsive.
- The most recent stage states are flushed before terminal job publication.
- Slow database persistence is recorded independently without slowing file processing.
