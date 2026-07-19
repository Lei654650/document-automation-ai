@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
set "LOGDIR=%ROOT%logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
cd /d "%ROOT%backend"
title Document Automation AI Backend
if not exist "%PY%" (
  echo Backend runtime is missing. Starting automatic repair...
  call "%ROOT%Setup_Once.bat" --automatic
  if errorlevel 1 exit /b 1
)
if not exist "%PY%" (
  echo [ERROR] Python environment could not be created. Check logs\setup.log.
  pause
  exit /b 1
)
echo ===== Backend start %date% %time% =====>>"%LOGDIR%\backend.log"
echo Backend output is being written to logs\backend.log.
"%PY%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 >>"%LOGDIR%\backend.log" 2>&1
set "RC=%errorlevel%"
echo Backend stopped with exit code %RC%.>>"%LOGDIR%\backend.log"
echo.
echo [ERROR] Backend stopped. Check logs\backend.log.
pause
exit /b %RC%
