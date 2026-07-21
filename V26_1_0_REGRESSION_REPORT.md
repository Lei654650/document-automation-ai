# V26.1.0 Regression Report

## Passed
- Python compile check for backend application.
- V26.1 knowledge center unit tests: 2 passed.
- Existing targeted translation/QC regression: 4 skipped because optional fixtures/dependencies were unavailable; no failures.
- Full backend suite result: 33 passed, 4 skipped, 6 failed.
- Frontend production build completed successfully with Vite.
- FastAPI startup smoke test completed.
- `/api/health`, `/api/capabilities`, knowledge overview/context, admin reload and SPA root all returned HTTP 200.
- Production frontend build copied into `backend/static`.

## Historical test gaps in the supplied V25.1.4 package
The six failures were not introduced by V26.1:
1. Three tests require historical sample files under `samples/acceptance` and `samples/v13_acceptance`, but those directories/files are absent from the supplied ZIP.
2. Two V21.3 tests require `/mnt/data/st07.xlsx`, which was not supplied with this project.
3. One V21.2 assertion expects a monolingual header, while the current V25.1.4 engine already produces the bilingual header `中文功能 / Chức năng tiếng Trung`.

These gaps are recorded rather than hidden. No V25 translation, OCR, conversion or delivery code was changed in V26.1.
