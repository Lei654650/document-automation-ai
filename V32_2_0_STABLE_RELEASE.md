# V32.2.0 Stable Release

## Enterprise File Workspace
- Fixed-height left workspace on desktop.
- Internal scrolling for large file batches.
- Compact add-more-files drop zone after upload.
- Statistics remain visible at the bottom.

## Source-driven Placeholder Self-Healing
- Canonical repair for damaged printf placeholders.
- Repeated placeholders remain independent and ordered.
- Validation follows placeholders owned by the source document, avoiding false failures from code-like translated prose.
- Invalid persistent translation-memory rows are rejected and rebuilt.

## Validation
- Python compilation passed.
- V32.2 and placeholder regression suite passed.
- Frontend JSX syntax parsing passed.
- Frontend production build was blocked in Linux by the uploaded Windows Rolldown optional dependency; source syntax is valid and the Windows startup/install flow is retained.
