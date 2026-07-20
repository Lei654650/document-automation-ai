@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "RUNTIME=%ROOT%.runtime"
set "LOGDIR=%ROOT%logs"
set "LOG=%LOGDIR%\setup.log"

cd /d "%ROOT%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%RUNTIME%" mkdir "%RUNTIME%"

>"%LOG%" echo ===== Document Automation AI setup started %date% %time% =====

echo ============================================================
echo Document Automation AI V23.0 Enterprise - Automatic Setup
echo ============================================================
echo This setup is launched automatically whenever required runtime files are missing.
echo.

set "PYTHON_EXE="
set "PYTHON_ARGS="
py.exe -3.14 -c "import sys" >nul 2>&1
if not errorlevel 1 (
  set "PYTHON_EXE=py.exe"
  set "PYTHON_ARGS=-3.14"
)
if not defined PYTHON_EXE (
  py.exe -3.13 -c "import sys" >nul 2>&1
  if not errorlevel 1 (
    set "PYTHON_EXE=py.exe"
    set "PYTHON_ARGS=-3.13"
  )
)
if not defined PYTHON_EXE (
  py.exe -3.12 -c "import sys" >nul 2>&1
  if not errorlevel 1 (
    set "PYTHON_EXE=py.exe"
    set "PYTHON_ARGS=-3.12"
  )
)
if not defined PYTHON_EXE (
  py.exe -3.11 -c "import sys" >nul 2>&1
  if not errorlevel 1 (
    set "PYTHON_EXE=py.exe"
    set "PYTHON_ARGS=-3.11"
  )
)
if not defined PYTHON_EXE (
  python.exe -c "import sys" >nul 2>&1
  if not errorlevel 1 set "PYTHON_EXE=python.exe"
)
if not defined PYTHON_EXE (
  echo [ERROR] Python 3.11 or newer was not found.
  echo ERROR: Python was not found.>>"%LOG%"
  pause
  exit /b 1
)

echo Python: %PYTHON_EXE% %PYTHON_ARGS%
echo Python: %PYTHON_EXE% %PYTHON_ARGS%>>"%LOG%"

set "NPM_RUN=%ROOT%Npm_Run.bat"
if not exist "%NPM_RUN%" (
  echo [ERROR] Npm_Run.bat is missing.
  echo ERROR: Npm_Run.bat is missing.>>"%LOG%"
  pause
  exit /b 1
)

call "%NPM_RUN%" --version >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js/npm is not available or the npm installation is damaged.
  echo ERROR: npm runtime check failed.>>"%LOG%"
  pause
  exit /b 1
)
echo npm runtime check: OK
echo npm runtime check: OK>>"%LOG%"

echo [1/4] Creating a clean Python virtual environment...
if not exist "%BACKEND%\.venv\Scripts\python.exe" (
  if exist "%BACKEND%\.venv" rmdir /s /q "%BACKEND%\.venv"
  "%PYTHON_EXE%" %PYTHON_ARGS% -m venv "%BACKEND%\.venv" >>"%LOG%" 2>&1
)
if errorlevel 1 (
  echo [ERROR] Failed to create Python virtual environment.
  echo ERROR: Failed to create Python virtual environment.>>"%LOG%"
  pause
  exit /b 1
)

set "VENV_PY=%BACKEND%\.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
  echo [ERROR] Virtual environment Python was not created.
  echo ERROR: Missing virtual environment Python.>>"%LOG%"
  pause
  exit /b 1
)

echo [2/4] Installing backend dependencies...
"%VENV_PY%" -m pip install --upgrade pip >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] pip upgrade failed.
  echo ERROR: pip upgrade failed.>>"%LOG%"
  pause
  exit /b 1
)
"%VENV_PY%" -m pip install -r "%BACKEND%\requirements.txt" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Backend dependency installation failed.
  echo ERROR: pip dependency installation failed.>>"%LOG%"
  pause
  exit /b 1
)

echo [3/4] Installing frontend dependencies...
cd /d "%FRONTEND%"
rem A ZIP may contain node_modules created on Linux. Remove it so npm installs Windows launchers and native packages.
if exist node_modules rmdir /s /q node_modules >>"%LOG%" 2>&1
if exist package-lock.json (
  call "%NPM_RUN%" ci --no-audit --no-fund >>"%LOG%" 2>&1
) else (
  call "%NPM_RUN%" install --no-audit --no-fund >>"%LOG%" 2>&1
)
if errorlevel 1 (
  echo [ERROR] Frontend dependency installation failed.
  echo ERROR: npm dependency installation failed.>>"%LOG%"
  pause
  exit /b 1
)

echo [4/4] Verifying frontend build...
call "%NPM_RUN%" run build >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [ERROR] Frontend build verification failed.
  echo ERROR: npm run build failed.>>"%LOG%"
  pause
  exit /b 1
)

cd /d "%ROOT%"
>"%RUNTIME%\setup.ready" echo Setup completed %date% %time%
echo SUCCESS: Setup completed.>>"%LOG%"
echo.
echo ============================================================
echo Setup completed successfully.
echo Runtime installation and verification are complete.
echo ============================================================
exit /b 0
