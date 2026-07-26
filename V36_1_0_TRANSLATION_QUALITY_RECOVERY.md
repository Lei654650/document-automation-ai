# V36.1.0 Translation Quality Recovery

- Versioned translation-memory namespace invalidates V36.0 polluted cache rows without destructive database migration.
- Vietnamese cache quality gate rejects Chinese source echoes, mixed Chinese/Vietnamese values, pending-review markers, known bad legacy phrases and duplicated PLC/HMI identifiers.
- Existing translated Excel files preserve clean Vietnamese while suspicious legacy output automatically returns to repair mode.
- Performance architecture from V36.0 remains: process-wide hot cache, batched provider calls and single-pass workbook writeback.
- Workspace, Knowledge Center, Settings Center, DOCX, PPTX and ZIP flows are unchanged.
