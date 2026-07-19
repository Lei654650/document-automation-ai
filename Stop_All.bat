@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Stop Document Automation AI
for %%R in (8000 5173) do (
  set "FOUND="
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%%R .*LISTENING"') do (
    set "FOUND=1"
    echo Stopping process %%P on port %%R...
    taskkill /PID %%P /F >nul 2>&1
  )
  if not defined FOUND echo No service is listening on port %%R.
)
echo Document Automation AI services stopped.
pause
