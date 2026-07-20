# V22.5.1 Vercel Runtime Fix

- Fixed `OSError: [Errno 30] Read-only file system: /var/task/uploads`.
- Vercel/serverless runtime now uses `/tmp/document-automation-ai` for temporary database, uploads, outputs and AI cache.
- Local Windows storage behavior is unchanged.
- Version updated to 22.5.1.

Important: Vercel `/tmp` is ephemeral. For permanent customer files and order history, connect an external database and object storage before production-scale operation.
