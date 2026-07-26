# V30.6.1 Translation Speed & Quality Fix

- Reduced provider batch payloads to avoid truncated JSON and recursive retry storms.
- Limited translation concurrency to a stable bounded value.
- Removed per-item AI retry fallback; only one small-batch retry is allowed.
- Optimized translation-memory hit-count updates with SQLite `executemany`.
- Quality control now blocks delivery when unresolved translations remain instead of outputting `Cần xác nhận bản dịch` placeholders.
- Existing PLC codes, formulas and workbook package structure remain protected.
