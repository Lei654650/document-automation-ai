@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
set "LOGDIR=%ROOT%logs"
set "APP_DATA_DIR=%ROOT%.runtime"

rem Local desktop defaults only. Explicit environment variables always win,
rem and cloud/container deployments do not use this Windows launcher.
if not defined APP_ENV set "APP_ENV=development"
if not defined CLOUD_MODE set "CLOUD_MODE=false"
if not defined EMAIL_VERIFICATION_DEV_CODE_ENABLED set "EMAIL_VERIFICATION_DEV_CODE_ENABLED=true"
if not defined PASSWORD_RESET_DEV_CODE_ENABLED set "PASSWORD_RESET_DEV_CODE_ENABLED=true"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%APP_DATA_DIR%" mkdir "%APP_DATA_DIR%"
cd /d "%ROOT%backend"
title Document Automation AI Backend V46.0.0
set "BACKEND_RUNTIME_OK=0"
if exist "%PY%" (
  "%PY%" -c "import sys" >nul 2>&1
  if not errorlevel 1 set "BACKEND_RUNTIME_OK=1"
)
if "%BACKEND_RUNTIME_OK%"=="0" (
  echo Backend runtime is missing. Starting automatic repair...
  call "%ROOT%Setup_Once.bat" --automatic
  @echo off
  if errorlevel 1 exit /b 1
)
if not exist "%PY%" (
  echo [ERROR] Python environment could not be created. Check logs\setup.log.
  pause
  exit /b 1
)

rem V40.1 archive regression guard: an existing venv may still miss optional archive packages.
"%PY%" -c "import py7zr, rarfile, stripe" >nul 2>&1
if errorlevel 1 (
  echo Archive support dependencies are missing. Repairing backend dependencies...
  echo ===== Archive dependency repair %date% %time% =====>>"%LOGDIR%\setup.log"
  "%PY%" -m pip install -r "%ROOT%backend\requirements.txt" >>"%LOGDIR%\setup.log" 2>&1
  if errorlevel 1 (
    echo [ERROR] Archive dependency repair failed. Check logs\setup.log.
    pause
    exit /b 1
  )
)
"%PY%" -c "import py7zr, rarfile, stripe" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Required backend dependencies are unavailable after repair. Check logs\setup.log.
  pause
  exit /b 1
)

>"%LOGDIR%\backend.log" echo ===== Backend start %date% %time% =====
>>"%LOGDIR%\backend.log" echo Version: V46.0.0
>>"%LOGDIR%\backend.log" echo Project root: %ROOT%
>>"%LOGDIR%\backend.log" echo Python: %PY%
for /d /r "%ROOT%backend" %%D in (__pycache__) do @if exist "%%D" rd /s /q "%%D" >nul 2>&1
echo Backend output is being written to logs\backend.log.
"%PY%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 >>"%LOGDIR%\backend.log" 2>&1
set "RC=%errorlevel%"
echo Backend stopped with exit code %RC%.>>"%LOGDIR%\backend.log"
echo.
echo [ERROR] Backend stopped. Check logs\backend.log.
pause
exit /b %RC%
