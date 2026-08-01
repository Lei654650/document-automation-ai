# Acceptance report

Version: Document Automation AI V45.0.0 Recovered

Source baseline: `D:\Develop\WebProjects\DAI_V45.0.0_RECOVERED`

Work was performed only in an isolated copy. No Git push, Render/Vercel deployment, production database connection, PayPal Live mode or real charge was performed.

## Results

| Area | Status | Evidence / boundary |
|---|---|---|
| Backend Health | 已实现并通过 | Real local process `/api/health`: HTTP 200, status `ok`, version `45.0.0`. |
| Frontend local proxy | 已实现并通过 | Real Vite process proxied `/api/health`: HTTP 200; frontend root HTTP 200. |
| Email registration and verification | 已实现并通过 | Local development-code register/confirm flow passed. Production SMTP still requires external configuration. |
| Login and logout | 已实现并通过 | Session creation, authenticated `me`, logout invalidation and re-login passed. |
| Forgot password | 已实现并通过 | Local one-time reset code, password update, old-password rejection and new-password login passed. |
| SMTP sending | 代码已接入但等待密钥 | STARTTLS/login/send logic passed with a fake SMTP transport; no external SMTP message was sent. |
| Google OAuth | 代码已接入但等待密钥 | Unconfigured state and 503 guard passed; frontend explicitly displays “未配置”. Real Google popup requires platform credentials/origins. |
| OpenAI Provider | 代码已接入但等待密钥 | Independent environment profile and secret-free public state passed. No real OpenAI request was made. |
| DeepSeek Provider | 代码已接入但等待密钥 | Independent environment profile and secret-free public state passed. No real DeepSeek request was made. |
| File upload | 已实现并通过 | Authenticated TXT multipart upload and order creation passed. |
| Task creation/status/download | 已实现并通过 | Interface-level task response, owned project status and authenticated output download passed. Existing V44/V45 document/workspace regressions also passed. |
| PayPal default safety | 已实现并通过 | Sandbox is the default; Live requires `PAYPAL_LIVE_ENABLED=true`; local config reported `live_checkout=false`. |
| PayPal Sandbox flow | 代码已接入但等待密钥 | Mocked Sandbox Checkout, Capture, webhook verification, order status, wallet and idempotent Credits passed. Real Sandbox network acceptance waits for user-provided credentials. |
| Paddle | 需要外部平台配置 | Checkout/webhook framework and templates exist; product/price mapping and external acceptance are pending. |
| Stripe | 需要外部平台配置 | Checkout/webhook framework and templates exist; external configuration and acceptance are pending. |
| Render | 需要外部平台配置 | `render.yaml`, Dockerfile, persistent disk and safe variable declarations prepared; not deployed. |
| Vercel | 需要外部平台配置 | `vercel.json` and `VITE_API_BASE_URL` flow prepared; not deployed. |
| Frontend production build | 已实现并通过 | Vite production build passed; output synchronized to `backend/static`. One bundle-size warning remains. |
| Backend static/critical tests | 已实现并通过 | Python compile passed; delivery acceptance 6/6; related V44/V45 regressions 8/8. |
| Startup scripts | 已实现并通过 | Static review: bounded waits, one backend and one frontend start, stale-port cleanup, no unbounded restart loop. |

## Test summary

- `backend/tests/test_v45_delivery_acceptance.py`: 6 passed.
- V44/V45 related regression selection: 8 passed.
- Python compile check: passed.
- Frontend build: passed.
- Real local Backend/Vite proxy smoke: passed.
- Warnings: FastAPI `on_event` deprecation; frontend bundle exceeds the 500 kB advisory threshold.

## Modified and added files

- `.dockerignore`
- `.gitignore`
- `.env.example`
- `.env.cloud.example`
- `backend/.env.example`
- `backend/.env.cloud.example`
- `backend/app/main.py`
- `backend/app/engines/translation_engine.py`
- `backend/PAYPAL_LIVE_1USD_SETUP.md`
- `backend/tests/test_v45_delivery_acceptance.py`
- `backend/static/*` generated from the accepted frontend build
- `frontend/.env.example`
- `frontend/src/App.jsx`
- `render.yaml`
- `docker-compose.cloud.yml`
- `vercel.json`
- `Start_Backend.bat`
- `scripts/Run-Local-Acceptance.ps1`
- `ENVIRONMENT_SETUP.md`
- `ENVIRONMENT_VARIABLES.md`
- `LOCAL_ACCEPTANCE.md`
- `ONLINE_DEPLOYMENT.md`
- `ACCEPTANCE_REPORT.md`
- `FILE_SHA256SUMS.txt`

## Incomplete items

- Real SMTP delivery, Google OAuth, OpenAI, DeepSeek and PayPal Sandbox tests require credentials and external platform configuration.
- Paddle and Stripe have not completed external end-to-end acceptance.
- Invoice generation/download remains incomplete in the recovered baseline.
- A full historical test suite was not run; the delivery and related regression suites were run.
- FastAPI lifespan migration and frontend code splitting remain maintenance/performance work.
- Online deployment and production data migration were intentionally not performed.
