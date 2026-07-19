@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "LOGDIR=%ROOT%logs"
set "NPM_RUN=%ROOT%Npm_Run.bat"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
cd /d "%FRONTEND%"
title Document Automation AI Frontend
if not exist "%FRONTEND%\node_modules\vite\bin\vite.js" (
  echo Frontend runtime is missing. Starting automatic repair...
  call "%ROOT%Setup_Once.bat" --automatic
  if errorlevel 1 exit /b 1
)
if not exist "%FRONTEND%\node_modules\vite\bin\vite.js" (
  echo [ERROR] Frontend dependencies could not be installed. Check logs\setup.log.
  pause
  exit /b 1
)
if not exist "%NPM_RUN%" (
  echo [ERROR] Npm_Run.bat is missing.
  pause
  exit /b 1
)
echo ===== Frontend start %date% %time% =====>>"%LOGDIR%\frontend.log"
echo Frontend output is being written to logs\frontend.log.
call "%NPM_RUN%" run dev -- --host 127.0.0.1 --port 5173 >>"%LOGDIR%\frontend.log" 2>&1
set "RC=%errorlevel%"
echo Frontend stopped with exit code %RC%.>>"%LOGDIR%\frontend.log"
echo.
echo [ERROR] Frontend stopped. Check logs\frontend.log.
pause
exit /b %RC%
