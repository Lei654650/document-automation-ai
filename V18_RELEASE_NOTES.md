# V18.0.0 Enterprise Runtime Architecture

- Setup_Once.bat performs dependency installation only once.
- Start_All.bat starts services without running pip or npm install.
- Backend readiness uses /api/health instead of only checking an open port.
- Duplicate backend/frontend processes are reused safely.
- UTF-8 setup, startup, backend and frontend logs.
- Stop_All.bat cleanly stops local services.
