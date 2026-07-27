# V43.0.2 Platform SMTP and AI Service Fix

- Fixed production environment precedence so Railway variables are no longer overwritten by blank values in `backend/.env`.
- SMTP settings are read from the live runtime environment for registration and password-reset delivery.
- Password reset continues to invalidate all existing sessions after a successful password change.
- Platform AI provider secrets can be supplied once by the platform administrator through Railway or the administrator center.
- If `TRANSLATION_PROVIDER` is omitted, the backend automatically selects the first configured platform provider.
- Empty saved provider profiles no longer erase valid Railway API keys.
- Customer-facing task status no longer asks customers to enter AI API keys.
