# V18.0.2 Batch 32% Fix

- Fixed multi-file Excel orders appearing frozen at 32%.
- Batch orders now report per-file and per-cell progress.
- Translation batches default to one provider worker to avoid API throttling and timeout pileups.
- Conversion progress is aggregated across all files and remains monotonic.
- Worker start, completion, elapsed time, and failures are written to backend logs.
- A failed file is isolated while remaining files continue.
- Added seven-Excel regression coverage.
