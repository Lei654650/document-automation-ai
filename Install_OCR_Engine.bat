@echo off
setlocal
cd /d "%~dp0"
title Document Automation AI OCR Setup
echo ==============================================
echo Document Automation AI V15.0.0 - OCR Setup
echo ==============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install_OCR_Engine.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo OCR setup completed successfully.
) else (
  echo OCR setup failed. Error code: %EXIT_CODE%
)
echo.
echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%
