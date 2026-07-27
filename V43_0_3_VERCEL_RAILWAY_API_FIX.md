# V43.0.3 Vercel → Railway API Fix

- Production frontend now uses `https://lan-docai.up.railway.app` as its backend API base.
- Local startup continues to use `http://localhost:8000`.
- Added a production environment file for Vercel builds.
- Added a defensive runtime fallback so a local-only API value can never leak into a public Vercel build.
- Added Vercel SPA routing configuration inside `frontend/`.
- Password-reset, registration, login, upload and all other `/api/*` calls now share the same production Railway origin.
