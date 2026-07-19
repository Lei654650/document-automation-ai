# V18.0.1 Setup Reliability Fix

- Rebuilt first-time setup around explicit child-process exit codes.
- Added Python 3.14 launcher detection.
- Setup invoked by Start_All now runs in the same window without a hidden pause.
- Setup errors are written as a final readable ERROR line in logs/setup.log.
- Copied .venv and node_modules are removed before a clean installation.
- Daily startup never reinstalls dependencies after setup.ready is created.
