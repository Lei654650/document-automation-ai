$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$NpmRun = Join-Path $Root "Npm_Run.bat"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Backend runtime is missing. Run Setup_Once.bat once, then rerun this script."
}
if (-not (Test-Path -LiteralPath $NpmRun)) {
    throw "Npm_Run.bat is missing."
}

$env:PYTHONDONTWRITEBYTECODE = "1"
Push-Location $Backend
try {
    & $Python -m compileall -q app
    if ($LASTEXITCODE -ne 0) { throw "Backend compile check failed." }
    & $Python -m pytest tests/test_v45_delivery_acceptance.py -q
    if ($LASTEXITCODE -ne 0) { throw "V45 delivery acceptance tests failed." }
}
finally {
    Pop-Location
}

Push-Location (Join-Path $Root "frontend")
try {
    & $NpmRun run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
}
finally {
    Pop-Location
}

Write-Host "Local acceptance and frontend build completed." -ForegroundColor Green
