@echo off
setlocal EnableExtensions

set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%~fI"
if not defined NODE_EXE if exist "D:\Develop\node.exe" set "NODE_EXE=D:\Develop\node.exe"
if not defined NODE_EXE (
  echo [ERROR] node.exe was not found.
  exit /b 1
)

for %%D in ("%NODE_EXE%") do set "NODE_DIR=%%~dpD"
set "NPM_CLI="
if exist "%NODE_DIR%node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%NODE_DIR%node_modules\npm\bin\npm-cli.js"
if not defined NPM_CLI if exist "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%APPDATA%\npm\node_modules\npm\bin\npm-cli.js"
if not defined NPM_CLI if exist "%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js"

if defined NPM_CLI (
  "%NODE_EXE%" "%NPM_CLI%" %*
  exit /b %errorlevel%
)

set "NPM_CMD="
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%~fI"
if not defined NPM_CMD (
  echo [ERROR] npm was not found next to Node.js or on PATH.
  exit /b 1
)

call "%NPM_CMD%" %*
exit /b %errorlevel%
