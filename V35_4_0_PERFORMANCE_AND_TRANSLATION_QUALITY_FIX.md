# V35.4.0 Performance and Translation Quality Fix

- Progress telemetry is dispatched asynchronously and coalesced so UI/SQLite callbacks cannot block Excel workers.
- Safe file-boundary pause/stop checks remain synchronous.
- Excel auto/vertical bilingual output now uses true source/target columns.
- PLC/HMI identifiers are preserved once and duplicate trailing codes are removed.
- Vietnamese terminology normalization fixes common project inconsistencies such as 备用, 载具, 减速度 and 回零.
- Source and target text remain isolated; no glued Chinese/Vietnamese cell output for auto/vertical spreadsheet processing.
- Added regression tests for slow progress callbacks, separate target columns, PLC code deduplication and terminology normalization.
