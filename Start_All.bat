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
cd /d "%ROOT%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%RUNTIME%" mkdir "%RUNTIME%"
title Document Automation AI V23.0 Enterprise

echo ============================================================
echo Document Automation AI V23.0 Enterprise - One Click Start
echo ============================================================
echo Project root: %ROOT%
echo ===== Start requested %date% %time% =====>>"%STARTLOG%"

rem Never trust setup.ready by itself. Verify the real runtime files.
set "NEED_SETUP=0"
if not exist "%VENV_PY%" set "NEED_SETUP=1"
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
    echo.
    echo [ERROR] Automatic setup did not complete.
    echo Please send logs\setup.log for inspection.
    pause
    exit /b 1
  )
)

rem Verify again after setup so stale marker files can never cause false success.
if not exist "%VENV_PY%" (
  echo [ERROR] Backend Python environment is still missing after setup.
  echo Check logs\setup.log.
  pause
  exit /b 1
)
if not exist "%FRONTEND%\node_modules\.bin\vite.cmd" (
  echo [ERROR] Frontend dependencies are still missing after setup.
  echo Check logs\setup.log.
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting backend...
  start "Document Automation AI Backend" "%ComSpec%" /k ""%ROOT%Start_Backend.bat""
) else (
  echo Backend port 8000 is already in use. Reusing the running backend.
)

echo Waiting for backend health check...
set /a COUNT=0
:WAIT_BACKEND
set /a COUNT+=1
curl.exe -fsS --max-time 2 http://127.0.0.1:8000/api/health >nul 2>&1
if not errorlevel 1 goto BACKEND_READY
if !COUNT! GEQ 180 (
  echo [ERROR] Backend did not become healthy within 180 seconds.
  echo Check logs\backend.log and the Backend window.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto WAIT_BACKEND

:BACKEND_READY
echo Backend is healthy.
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo Starting frontend...
  start "Document Automation AI Frontend" "%ComSpec%" /k ""%ROOT%Start_Frontend.bat""
) else (
  echo Frontend port 5173 is already in use. Reusing the running frontend.
)

echo Waiting for frontend...
set /a COUNT=0
:WAIT_FRONTEND
set /a COUNT+=1
curl.exe -fsS --max-time 2 http://127.0.0.1:5173/ >nul 2>&1
if not errorlevel 1 goto FRONTEND_READY
if !COUNT! GEQ 180 (
  echo [ERROR] Frontend did not become ready within 180 seconds.
  echo Check logs\frontend.log and the Frontend window.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto WAIT_FRONTEND

:FRONTEND_READY
echo Frontend is ready.
echo Opening website...
start "" http://127.0.0.1:5173
echo.
echo ============================================================
echo Document Automation AI is running.
echo Backend: http://127.0.0.1:8000/api/health
echo Frontend: http://127.0.0.1:5173
echo ============================================================
exit /b 0
