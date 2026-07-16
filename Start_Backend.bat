@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%Start_Backend.ps1"
exit /b %errorlevel%
