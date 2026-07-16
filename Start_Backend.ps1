$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$LogDir = Join-Path $Root "logs"
$Log = Join-Path $LogDir "backend.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location -LiteralPath $Backend
$Host.UI.RawUI.WindowTitle = "Document AI Backend - V10 Enterprise"

function Fail([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Add-Content -LiteralPath $Log -Value "ERROR: $Message"
    Write-Host "Log file: $Log"
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "=================================================="
Write-Host "Document Automation AI V10 Enterprise - Backend"
Write-Host "=================================================="
Write-Host "Working directory: $Backend"
Add-Content -LiteralPath $Log -Value "`n===== Backend start: $(Get-Date) ====="
Add-Content -LiteralPath $Log -Value "Working directory: $Backend"

if (-not (Test-Path -LiteralPath (Join-Path $Backend "app\main.py"))) { Fail "backend\app\main.py was not found." }
if (-not (Test-Path -LiteralPath (Join-Path $Backend "requirements.txt"))) { Fail "backend\requirements.txt was not found." }

$Python = $null
if (Get-Command py -ErrorAction SilentlyContinue) { $Python = @("py", "-3") }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $Python = @("python") }
else { Fail "Python was not found in PATH." }

$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$Recreate = $false
if (Test-Path -LiteralPath $VenvPython) {
    try { & $VenvPython --version *> $null; if ($LASTEXITCODE -ne 0) { $Recreate = $true } }
    catch { $Recreate = $true }
}
if ($Recreate) {
    Write-Host "Existing virtual environment is not portable. Recreating it..."
    Remove-Item -LiteralPath (Join-Path $Backend ".venv") -Recurse -Force
}
if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Host "[1/4] Creating Python virtual environment..."
    if ($Python.Count -eq 2) { & $Python[0] $Python[1] -m venv .venv *>> $Log }
    else { & $Python[0] -m venv .venv *>> $Log }
    if ($LASTEXITCODE -ne 0) { Fail "Could not create the Python virtual environment." }
} else { Write-Host "[1/4] Python virtual environment already exists." }

if (-not (Test-Path -LiteralPath (Join-Path $Backend ".env"))) {
    Copy-Item -LiteralPath (Join-Path $Backend ".env.example") -Destination (Join-Path $Backend ".env")
}

Write-Host "[2/4] Checking pip..."
& $VenvPython -m pip --version *>> $Log
if ($LASTEXITCODE -ne 0) { Fail "pip is unavailable in the virtual environment." }

$RequirementsHash = (Get-FileHash -LiteralPath (Join-Path $Backend "requirements.txt") -Algorithm SHA256).Hash
$DependencyStamp = Join-Path $Backend ".venv\requirements.sha256"
$InstalledHash = if (Test-Path -LiteralPath $DependencyStamp) { (Get-Content -LiteralPath $DependencyStamp -Raw).Trim() } else { "" }
if ($InstalledHash -ne $RequirementsHash) {
    Write-Host "[3/4] Installing/updating backend dependencies..."
    & $VenvPython -m pip install -r requirements.txt *>> $Log
    if ($LASTEXITCODE -ne 0) { Fail "Backend dependency installation failed." }
    Set-Content -LiteralPath $DependencyStamp -Value $RequirementsHash -Encoding ascii
} else {
    Write-Host "[3/4] Backend dependencies are up to date."
}

Write-Host "[4/4] Starting backend..."
Write-Host "Backend: http://localhost:8000"
Write-Host "API docs: http://localhost:8000/docs"
Write-Host "Keep this window open."
& $VenvPython -m uvicorn app.main:app --app-dir $Backend --host 127.0.0.1 --port 8000
Fail "Backend server stopped unexpectedly."
