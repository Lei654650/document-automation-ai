$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location (Join-Path $Root "frontend")
if (-not (Test-Path "node_modules\.bin\vite.cmd")) { npm install }
npm run build
Pop-Location
Write-Host "Frontend build completed." -ForegroundColor Green
