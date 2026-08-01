# V45 Authentication and Navigation Repair

## Fixed

1. Production API URL resolution now ignores placeholder values such as `https://api.example.com`.
2. On `docai365.com` and `www.docai365.com`, the frontend safely falls back to `https://api.docai365.com` when the Vercel variable is missing or still a placeholder.
3. Google auth configuration accepts both backend snake_case fields (`google_enabled`, `google_client_id`) and camelCase fields.
4. Auth configuration failures now write a useful browser console diagnostic including the resolved API base.
5. Backend CORS always permits the two official frontend origins:
   - `https://docai365.com`
   - `https://www.docai365.com`
6. Successful email/Google login now returns to the website home page instead of forcing users directly into the workspace.

## Deployment values

Vercel:

```env
VITE_API_BASE_URL=https://api.docai365.com
```

Railway:

```env
CORS_ORIGINS=https://docai365.com,https://www.docai365.com
GOOGLE_REDIRECT_URI=https://www.docai365.com/auth/google/callback
```

## Verification

1. Deploy the backend to Railway.
2. Deploy the frontend to Vercel.
3. Open an incognito window at `https://www.docai365.com/login`.
4. Confirm the Google button renders without the "GOOGLE_CLIENT_ID not configured" warning.
5. Complete Google login and confirm the first landing page is the public home page.
6. Confirm the workspace contains its Home navigation entry.

## Build note

Python syntax validation passed for `backend/app/main.py`.
The frontend build could not be completed in this environment because the internal npm registry does not provide `yallist@3.1.1`, an existing dependency required by the lockfile. Run `npm ci && npm run build` in the normal developer environment before deployment.
