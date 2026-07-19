# Document Automation AI V19.2.0

## Core fixes
- XLSX translation now edits text directly inside the OOXML package instead of rebuilding the workbook with openpyxl.
- Row/column coordinates, numeric values, formulas, styles, custom number formats, images, comments, links, print settings and worksheet metadata remain intact.
- Translation write-back uses exact source text mapping; provider response order is never treated as a cell-address mapping.
- Added SQLite translation memory shared across runs and bounded parallel batch requests.
- Protected Excel errors, formulas, numeric values, codes, PLC-style identifiers and URLs from translation.
- Smart data organization defaults to enterprise-safe mode: no row/column deletion, de-duplication, sorting, resizing or freezing changes.
- Intermediate organization copies are removed after the single final customer deliverable is produced.
- Delivery lists display up to 100 files per page and retain search.
- Download dialog now clearly distinguishes browser save location from the software's internal output directory.

## Validation
- Backend syntax and focused regression tests passed.
- Frontend production build passed.
- Real customer workbooks st02-st09 were processed with a deterministic fake translator for structural validation.
