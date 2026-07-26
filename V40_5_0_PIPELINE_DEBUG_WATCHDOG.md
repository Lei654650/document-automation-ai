# V40.5.0 Pipeline Debug & Watchdog

- Added step-level PIPELINE logs after OOXML write-back.
- Isolated Excel side-by-side column generation in a child Python process.
- Added a hard timeout (default 90 seconds) so one workbook cannot leave an order at 36% forever.
- Added explicit ENTER/RETURN/FINISHED/TIMEOUT records with file, thread, item count and elapsed time.
- Added diagnostic logs for multiline layout, package validation and translate_xlsx completion.
- Kept V40.4 archive extraction, translation memory and local-first translation behavior.
