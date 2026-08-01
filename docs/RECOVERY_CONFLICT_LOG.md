# Recovery conflict log

## Files merged by functional delta

### `backend/app/main.py`

Sources: V44 baseline, V44 document center, V45 ownership/settings, payment
commit `e592291`.

Resolution:

- Preserved the V45 application version and ownership/settings endpoints.
- Preserved the final V44 document analysis and recommendation flow.
- Preserved the baseline's integrated PayPal checkout, capture, order, wallet,
  credits and webhook implementations.
- Added only the missing opt-in PayPal Live acceptance-price controls from
  `e592291`.
- Did not restore the historical duplicate `backend/app/services/main.py`.

### `frontend/src/App.jsx`

Sources: V44 baseline, V44 document center and V45 workspace snapshots.

Resolution:

- Applied document-center changes as a source delta.
- Applied V45 workspace/settings changes as a later source delta.
- Preserved the existing PayPal return, capture, wallet and success modal.
- Did not replace the file with the older payment-commit version.

### `frontend/src/App.css`

Sources: V44 baseline and V45 scope snapshot.

Resolution:

- Applied only the V45 delta.
- Preserved existing payment, pricing and wallet styles.

### `backend/app/engines/job_engine.py`

Sources: V44 baseline and final V44 document-processing module.

Resolution:

- Applied only the document-processing delta.
- Preserved existing task and credits integration outside that delta.

### `backend/app/services/document_analyzer.py`

Sources: V44 baseline and final V44 document-processing module.

Resolution: applied the final V44 analyzer delta without replacing unrelated
backend modules.

### `frontend/package.json` and `frontend/package-lock.json`

Sources: V44 document project and V45 scope snapshot.

Resolution: applied the V45 dependency delta; no dependency directory is
included in the delivery archive.

## Explicitly rejected overwrite sources

- `backend/app/services/main.py` from the old payment tree: duplicate/historical
  entry point and not used as the recovered runtime entry point.
- `backend/data/orders.db`: runtime and user/payment data.
- old `backend/static/assets/*`: replaced by a fresh merged frontend build.
- nested `frontend/frontend/` from an intermediate V45 package: packaging
  duplication, not an application source root.

