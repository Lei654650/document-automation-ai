@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
cd /d "%ROOT%"
title Document Automation AI V10 Enterprise Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%Start_All.ps1"
exit /b %errorlevel%
