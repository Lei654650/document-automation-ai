$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root "logs"
$Log = Join-Path $LogDir "startup.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Fail([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Add-Content -LiteralPath $Log -Value "ERROR: $Message"
    Write-Host "Log file: $Log"
    Read-Host "Press Enter to close"
    exit 1
}

function Wait-Port([int]$Port, [int]$Seconds) {
    for ($i = 0; $i -lt $Seconds; $i++) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne(500) -and $client.Connected) {
                $client.Close()
                return $true
            }
            $client.Close()
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

Set-Content -LiteralPath $Log -Value "===== Document Automation AI V10 Enterprise startup: $(Get-Date) ====="
Write-Host "=================================================="
Write-Host "Document Automation AI V10 Enterprise"
Write-Host "=================================================="
Write-Host "Project root: $Root"

$Required = @(
    (Join-Path $Root "backend\app\main.py"),
    (Join-Path $Root "backend\requirements.txt"),
    (Join-Path $Root "frontend\package.json"),
    (Join-Path $Root "frontend\src\App.jsx")
)
foreach ($item in $Required) {
    if (-not (Test-Path -LiteralPath $item)) { Fail "Project file is missing: $item" }
}

Write-Host "Starting backend..."
Start-Process powershell.exe -WorkingDirectory (Join-Path $Root "backend") -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "Start_Backend.ps1")
)

Write-Host "Waiting for backend on port 8000..."
if (-not (Wait-Port 8000 180)) { Fail "Backend did not become ready within 3 minutes. Check logs\backend.log." }
Write-Host "Backend is ready." -ForegroundColor Green

Write-Host "Starting frontend..."
Start-Process powershell.exe -WorkingDirectory (Join-Path $Root "frontend") -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "Start_Frontend.ps1")
)

Write-Host "Waiting for frontend on port 5173..."
if (-not (Wait-Port 5173 240)) { Fail "Frontend did not become ready within 4 minutes. Check logs\frontend.log." }
Write-Host "Frontend is ready." -ForegroundColor Green

Start-Process "http://localhost:5173"
Write-Host "Website opened: http://localhost:5173"
Write-Host "API docs: http://localhost:8000/docs"
Write-Host "Keep the backend and frontend windows open."
Add-Content -LiteralPath $Log -Value "Startup completed successfully: $(Get-Date)"
Read-Host "Press Enter to close this launcher window"
