$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $Root "frontend\dist")
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $Root "logs\*.log")
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $Root "backend\data\orders.db")
Write-Host "Runtime artifacts cleaned." -ForegroundColor Green
