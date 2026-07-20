# V25.0.0

- Added resumable 2 MB chunk uploads to bypass Vercel function payload limits.
- Added verified upload sessions and order creation from completed uploads.
- Added stalled-job recovery endpoint and reduced stale detection to five minutes.
- Updated cloud upload messaging and version metadata.
- Large uploads still depend on the active Vercel instance temporary storage; production scale should use Vercel Blob/S3/R2.
