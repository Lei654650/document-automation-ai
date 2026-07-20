# Document Automation AI — Version 25.1.4

完整企业级 AI 文档自动化工程。

## 本地启动

双击根目录 `Start_All.bat`。脚本会检查并安装前后端依赖，然后打开：

- Website: http://localhost:5173
- API docs: http://localhost:8000/docs

## 工程结构

- `frontend/` React + Vite 前端
- `backend/` FastAPI 后端
- `Start_All.bat` Windows 一键启动

## 版本

Version 25.1.4

## OCR setup on Windows

Run `Install_OCR_Engine.bat` from the project root. The window remains open and reports a clear success or error message. After setup, close any running backend window and run `Start_All.bat` again.


## V18 Windows startup

1. After replacing or extracting the project, double-click `Setup_Once.bat` once.
2. After setup succeeds, use `Start_All.bat` for normal daily startup.
3. Use `Stop_All.bat` before replacing the project or when services must be stopped.
4. Dependency installation is no longer part of normal startup.
5. Logs are stored in `logs/setup.log`, `logs/backend.log`, `logs/frontend.log`, and `logs/startup.log`.
