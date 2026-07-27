@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "RUNTIME=%ROOT%.runtime"
set "LOGDIR=%ROOT%logs"
set "STARTLOG=%LOGDIR%\startup.log"
set "VENV_PY=%BACKEND%\.venv\Scripts\python.exe"
set "NPM_RUN=%ROOT%Npm_Run.bat"
set "APP_VERSION=41.1.0"
cd /d "%ROOT%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%RUNTIME%" mkdir "%RUNTIME%"
title Document Automation AI V%APP_VERSION%

echo ============================================================
echo Document Automation AI V%APP_VERSION% - One Click Start
echo ============================================================
echo Project root: %ROOT%
echo ===== Start requested %date% %time% =====>>"%STARTLOG%"

rem Never trust setup.ready by itself. Verify the real runtime files.
set "NEED_SETUP=0"
if not exist "%VENV_PY%" set "NEED_SETUP=1"
if exist "%VENV_PY%" (
  "%VENV_PY%" -c "import py7zr, rarfile" >nul 2>&1
  if errorlevel 1 set "NEED_SETUP=1"
)
if not exist "%FRONTEND%\node_modules\.bin\vite.cmd" set "NEED_SETUP=1"
if not exist "%FRONTEND%\node_modules\react\package.json" set "NEED_SETUP=1"

if "%NEED_SETUP%"=="1" (
  echo.
  echo Required runtime files are missing.
  echo Automatic first-time setup will now run. No separate setup step is needed.
  echo.
  if exist "%RUNTIME%\setup.ready" del /q "%RUNTIME%\setup.ready" >nul 2>&1
  call "%ROOT%Setup_Once.bat" --automatic
  if errorlevel 1 (
    echo [ERROR] Automatic setup did not complete.
    echo Please send logs\setup.log for inspection.
    pause
    exit /b 1
  )
)

if not exist "%VENV_PY%" (
  echo [ERROR] Backend Python environment is still missing after setup.
  pause
  exit /b 1
)
if not exist "%FRONTEND%\node_modules\.bin\vite.cmd" (
  echo [ERROR] Frontend dependencies are still missing after setup.
  pause
  exit /b 1
)

rem P0: Never reuse a backend/frontend left running from an older extracted folder.
rem The previous launcher reused any listener on 8000/5173, which made V40 open a
rem V35 process and produced old XLSX errors while the UI appeared to be V40.
call :STOP_PORT 8000 Backend
call :STOP_PORT 5173 Frontend

echo Starting backend...
start "Document Automation AI Backend V%APP_VERSION%" "%ComSpec%" /d /q /k ""%ROOT%Start_Backend.bat""

echo Waiting for backend health check and project identity...
set /a COUNT=0
:WAIT_BACKEND
set /a COUNT+=1
set "BACKEND_STATE="
for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "try { $h=Invoke-RestMethod -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8000/api/health; $expected=[IO.Path]::GetFullPath('%ROOT%').TrimEnd([char]92); $actual=[IO.Path]::GetFullPath([string]$h.project_root).TrimEnd([char]92); if(($h.status -eq 'ok') -and ($h.readiness -ne 'blocked') -and ($actual -eq $expected)){ 'READY|' + [string]$h.version } } catch {}"`) do set "BACKEND_STATE=%%V"
if /I "!BACKEND_STATE:~0,6!"=="READY|" (
  set "BACKEND_VERSION=!BACKEND_STATE:~6!"
  goto BACKEND_READY
)
if !COUNT! GEQ 180 (
  echo [ERROR] Backend did not become healthy for this project within 180 seconds.
  echo Check logs\backend.log and logs\startup.log.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto WAIT_BACKEND

:BACKEND_READY
if not defined BACKEND_VERSION set "BACKEND_VERSION=unknown"
echo Backend V!BACKEND_VERSION! is healthy.
echo Starting frontend...
start "Document Automation AI Frontend V%APP_VERSION%" "%ComSpec%" /d /q /k ""%ROOT%Start_Frontend.bat""

echo Waiting for frontend...
set /a COUNT=0
:WAIT_FRONTEND
set /a COUNT+=1
curl.exe -fsS --max-time 2 http://127.0.0.1:5173/ >nul 2>&1
if not errorlevel 1 goto FRONTEND_READY
if !COUNT! GEQ 180 (
  echo [ERROR] Frontend did not become ready within 180 seconds.
  echo Check logs\frontend.log.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto WAIT_FRONTEND

:FRONTEND_READY
echo Frontend is ready.
start "" http://127.0.0.1:5173
echo.
echo ============================================================
echo Document Automation AI V%APP_VERSION% is running.
echo Backend: http://127.0.0.1:8000/api/health
echo Frontend: http://127.0.0.1:5173
echo ============================================================
exit /b 0

:STOP_PORT
set "PORT=%~1"
set "LABEL=%~2"
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "FOUND=1"
  echo Stopping stale %LABEL% process on port %PORT% ^(PID %%P^)...
  echo Stopping stale %LABEL% PID %%P on port %PORT%>>"%STARTLOG%"
  taskkill /PID %%P /T /F >nul 2>&1
)
if "!FOUND!"=="1" timeout /t 2 /nobreak >nul
exit /b 0
