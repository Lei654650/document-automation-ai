# V35.2.0 Progress Barrier Fix

- Removed synchronous pause waiting from ordinary progress telemetry.
- Pause and stop are now observed at safe file boundaries after the current file/provider operation.
- Prevents the 200–280 second idle gap seen after XLSX write completion.
- Preserves non-blocking SQLite progress persistence and task controls.
- No UI, translation, quality-policy, pricing, navigation, or startup changes.
