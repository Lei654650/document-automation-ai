@echo off
setlocal
cd /d "%~dp0"
title Document Automation AI Diagnostic

echo ==================================================
echo Document Automation AI V6 - Diagnostic
echo ==================================================
echo Project folder: %cd%
echo.

echo [Python]
where python
python --version
echo.
echo [Python launcher]
where py
py -3 --version
echo.
echo [Node.js]
where node
node --version
echo.
echo [npm]
where npm
call npm --version
echo.
echo [Important files]
if exist "backend\requirements.txt" (echo OK backend\requirements.txt) else (echo MISSING backend\requirements.txt)
if exist "backend\app\main.py" (echo OK backend\app\main.py) else (echo MISSING backend\app\main.py)
if exist "frontend\package.json" (echo OK frontend\package.json) else (echo MISSING frontend\package.json)
if exist "frontend\src\App.jsx" (echo OK frontend\src\App.jsx) else (echo MISSING frontend\src\App.jsx)
echo.
echo Diagnostic complete. Send a screenshot if any item shows MISSING or an error.
pause
