$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Frontend = Join-Path $Root "frontend"
$LogDir = Join-Path $Root "logs"
$Log = Join-Path $LogDir "frontend.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location -LiteralPath $Frontend
$Host.UI.RawUI.WindowTitle = "Document AI Frontend - V10 Enterprise"

function Fail([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Add-Content -LiteralPath $Log -Value "ERROR: $Message"
    Write-Host "Log file: $Log"
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "=================================================="
Write-Host "Document Automation AI V10 Enterprise - Frontend"
Write-Host "=================================================="
Write-Host "Working directory: $Frontend"
Add-Content -LiteralPath $Log -Value "`n===== Frontend start: $(Get-Date) ====="
Add-Content -LiteralPath $Log -Value "Working directory: $Frontend"

if (-not (Test-Path -LiteralPath (Join-Path $Frontend "package.json"))) { Fail "frontend\package.json was not found." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js was not found in PATH." }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { Fail "npm was not found in PATH." }

Write-Host "Node.js version: $(& node --version)"
Write-Host "npm version: $(& npm.cmd --version)"
if (-not (Test-Path -LiteralPath (Join-Path $Frontend ".env"))) {
    Set-Content -LiteralPath (Join-Path $Frontend ".env") -Value "VITE_API_BASE=http://localhost:8000" -Encoding ascii
}

if (-not (Test-Path -LiteralPath (Join-Path $Frontend "node_modules"))) {
    Write-Host "[1/2] Installing frontend dependencies..."
    & npm.cmd install *>> $Log
    if ($LASTEXITCODE -ne 0) { Fail "Frontend dependency installation failed." }
} else { Write-Host "[1/2] Frontend dependencies already exist." }

Write-Host "[2/2] Starting frontend..."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Keep this window open."
& npm.cmd run dev -- --host 127.0.0.1
Fail "Frontend server stopped unexpectedly."
