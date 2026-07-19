$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Required = @("frontend","backend","docs","scripts","samples","release","Start_All.bat","Start_Backend.bat","Start_Frontend.bat","README.md","VERSION.md","CHANGELOG.md")
foreach ($item in $Required) { if (-not (Test-Path (Join-Path $Root $item))) { throw "Missing: $item" } }
Write-Host "Project structure verified." -ForegroundColor Green
