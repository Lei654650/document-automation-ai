# Recovery source manifest

Recovered version: Document Automation AI V45.0.0 Recovered

This project was assembled in a new workspace copy. The original project at
`D:\Develop\WebProjects\DAI_V40.5.3` was not modified.

## Layer 1: complete V44 baseline

Source:
`work/final-acceptance-v44-2/DAI_V40.5.3`

The baseline supplies every file not explicitly replaced or added below.

## Layer 2: V44 document processing center

Source:
`work/V44_Document_Processing_Module`

Delta-applied files:

- `backend/app/main.py`
- `backend/app/engines/job_engine.py`
- `backend/app/services/document_analyzer.py`
- `backend/tests/test_v44_workspace_recommendation.py`
- `frontend/src/App.jsx`

Added files:

- `backend/tests/test_v44_document_intelligence.py`
- `frontend/src/components/processing/AIAnalysisPanel.jsx`
- `frontend/src/components/processing/ProcessingJourney.jsx`
- `frontend/src/components/processing/ProcessingPlanPanel.jsx`
- `frontend/src/styles/v44-workspace-experience.css`

## Layer 3: V45 workspace, settings and ownership

Primary source:
`work/v45-scope-fix-stage3-20260731`

Supporting source:
`work/frontend-v45-round2-20260731/frontend`

Delta-applied files:

- `backend/app/main.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/App.css`
- `frontend/src/App.jsx`

Added files:

- `backend/tests/test_v45_workspace_ownership.py`
- `frontend/src/components/processing/TaskStyleOptions.css`
- `frontend/src/components/processing/TaskStyleOptions.jsx`
- `frontend/src/components/settings/DefaultProcessingTemplates.css`
- `frontend/src/components/settings/DefaultProcessingTemplates.jsx`
- `frontend/src/components/settings/GeneralSettingsPanel.css`
- `frontend/src/components/settings/GeneralSettingsPanel.jsx`
- `frontend/src/components/ui/HoverSelect.css`
- `frontend/src/components/ui/HoverSelect.jsx`
- `frontend/src/components/workspace/WorkspaceHeaderTools.css`
- `frontend/src/components/workspace/WorkspaceHeaderTools.jsx`
- `frontend/src/components/workspace/WorkspaceTopbar.css`
- `frontend/src/components/workspace/WorkspaceTopbar.jsx`
- `frontend/src/styles/v45-shared-controls.css`

## Layer 4: payment system

Git source commit:
`e592291fe561b574d24d53d1e39427bd3fb20974`

The V44 baseline already contained the newer integrated PayPal checkout,
capture, payment orders, wallet, credits, webhook and payment-success flow.
Those newer integrated sections were preserved. The recovery added the
missing server-side, opt-in PayPal Live acceptance price controls and restored
the original setup document from the commit.

Payment recovery files:

- `backend/app/main.py`
- `backend/.env.example`
- `backend/.env.cloud.example`
- `.env.example`
- `backend/PAYPAL_LIVE_1USD_SETUP.md`

`PAYPAL_TEST_PRICE_CENTS` defaults to `0`; the recovered project does not
silently enable a real-charge acceptance price.

## Generated frontend static files

The merged frontend was built into `backend/static` after all source layers
were applied. Historical static assets were not reused.

## Excluded content

- `.git`
- `.env`
- `orders.db` and other runtime databases
- user data
- uploads and outputs
- `.venv` and temporary Python runtimes
- `node_modules`
- test/runtime caches
- historical static build assets

