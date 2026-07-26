# V32.0.2 Repeated Placeholder Recovery Fix

- Every PLC/HMI placeholder occurrence remains independently masked, even when the original value repeats.
- Provider-added spacing around internal protection tokens is repaired before restoration.
- Translation-memory entries are validated on read.
- Repairable historical values such as `%(WATCH1) - d` are canonicalised and rewritten to memory.
- Cached values with a missing or reordered placeholder are deleted and translated again instead of failing the job.
- Added regression coverage for repeated `%(WATCH1)d` placeholders.
