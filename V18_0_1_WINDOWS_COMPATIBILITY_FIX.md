# V18.0.2 Windows Compatibility Fix

- Removed the PowerShell `ProcessStartInfo.ArgumentList` startup implementation.
- Setup and daily startup now use Windows batch commands only.
- Compatible with Windows PowerShell 5.1 because PowerShell is no longer required for runtime setup/start.
- `Setup_Once.bat` performs first-time dependency installation and writes `.runtime/setup.ready` only after all checks pass.
- `Start_All.bat` performs backend/frontend health checks with Windows `curl.exe`.
- `Stop_All.bat` stops only listeners on ports 8000 and 5173.
