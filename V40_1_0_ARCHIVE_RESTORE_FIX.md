# V40.1.0 Archive Restore Fix

- Restored archive dependency verification during every Windows startup.
- Automatically repairs missing py7zr/rarfile dependencies without requiring users to recreate the environment manually.
- Added archive capability diagnostics endpoint.
- Added frontend archive inspection timeout handling and compatibility fallback.
- Added explicit archive extensions to file upload controls.
- Added ZIP/TAR/GZ/7Z extraction regression tests.
