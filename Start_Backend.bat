@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
set "LOGDIR=%ROOT%logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
cd /d "%ROOT%backend"
title Document Automation AI Backend V40.5.0
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

rem V40.1 archive regression guard: an existing venv may still miss optional archive packages.
"%PY%" -c "import py7zr, rarfile" >nul 2>&1
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
"%PY%" -c "import py7zr, rarfile" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ZIP/7Z/RAR support is unavailable after repair. Check logs\setup.log.
  pause
  exit /b 1
)

>"%LOGDIR%\backend.log" echo ===== Backend start %date% %time% =====
>>"%LOGDIR%\backend.log" echo Version: V40.5.0
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
