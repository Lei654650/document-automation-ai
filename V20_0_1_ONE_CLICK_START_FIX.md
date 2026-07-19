# V20.0.1 One-click startup repair

- Start_All.bat now validates the real Python and frontend runtime files instead of trusting `.runtime/setup.ready`.
- Missing backend or frontend dependencies trigger Setup_Once.bat automatically.
- Start_Backend.bat and Start_Frontend.bat can self-repair missing dependencies.
- Setup is incremental and no longer deletes working environments on every repair.
- Startup waits up to 180 seconds for slower first runs.
