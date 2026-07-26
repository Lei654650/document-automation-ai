# V36.0.0 Performance Sprint

- Added a process-wide validated translation hot cache shared across all files in one batch.
- Repeated PLC/HMI terms now bypass repeated SQLite opens and repeated validation work.
- Hot-cache invalidation is synchronized with persistent-memory invalidation to prevent stale translations.
- Reused one target-only translation client for bilingual Excel repair instead of rebuilding provider settings for every workbook.
- Preserved the existing single-pass OOXML write-back, old-file repair mode, confirmed translation preservation, and placeholder protection.
- Added regression coverage for RAM cache hits and invalidation.
