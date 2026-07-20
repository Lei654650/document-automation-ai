# V22.5.2 Serverless 32% Fix

- Fixed Vercel processing jobs stopping at 32%.
- Vercel now executes the processing worker within the active request instead of a daemon thread.
- Local Windows/container mode keeps background processing.
- Increased the browser upload/processing request timeout to 15 minutes.
- Updated frontend and backend version to 22.5.2.

Important: Vercel `/tmp` remains temporary storage. Production persistence still requires object storage and a cloud database.
