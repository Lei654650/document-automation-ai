# V30.6.2 Quality Delivery Gate Fix

- Fixed a regression where any unresolved engineering label raised an exception inside the Excel translation worker.
- A single provider omission no longer discards the entire processed workbook or causes all files to show as failed.
- Unresolved labels are preserved with an explicit target-language review marker, so the workbook remains downloadable and reviewable.
- The processing log now reports the unresolved count instead of returning only a generic quality-check failure.
- PLC codes, formulas, workbook package structure, formatting and original source text remain protected.
