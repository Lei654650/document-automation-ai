# V18.0.2 npm startup fix

## Root cause
The portable Node.js installation resolved npm relative to the frontend working directory and attempted to load:
`frontend\\node_modules\\npm\\bin\\npm-cli.js`.

## Fix
- Added `Npm_Run.bat`.
- Resolve the absolute `node.exe` path first.
- Invoke the npm CLI directly from the Node.js installation directory.
- Use the same npm runner for setup, build, diagnostics, and frontend startup.
- Disable npm audit/fund network calls during first setup.
