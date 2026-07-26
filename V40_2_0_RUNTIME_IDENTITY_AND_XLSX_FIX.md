# V40.2.0 Runtime Identity and XLSX Delivery Fix

- Stop stale processes on ports 8000 and 5173 before startup.
- Verify backend version 40.2.0 before opening the frontend.
- Health endpoint now exposes project root and process ID for diagnostics.
- XLSX delivery validation accepts valid inline-string workbooks and only requires sharedStrings.xml when worksheets reference it.
- Side-by-side Excel layout now saves to a unique temporary file, validates it, and replaces the output with retry/cleanup protection.
