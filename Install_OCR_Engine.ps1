$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host ("[OCR Setup] " + $Message) -ForegroundColor Cyan
}

function Find-Tesseract {
    $command = Get-Command tesseract.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $candidates = @(
        "$env:ProgramFiles\Tesseract-OCR\tesseract.exe",
        "${env:ProgramFiles(x86)}\Tesseract-OCR\tesseract.exe",
        "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    return $null
}

function Find-Python {
    foreach ($name in @("py", "python", "python3")) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) { return $name }
    }
    return $null
}

function Set-EnvValue([string]$FilePath, [string]$Name, [string]$Value) {
    $lines = @()
    if (Test-Path -LiteralPath $FilePath) {
        $lines = @(Get-Content -LiteralPath $FilePath -ErrorAction Stop)
    }

    $prefix = $Name + "="
    $replacement = $prefix + $Value
    $found = $false
    $result = New-Object System.Collections.Generic.List[string]

    foreach ($line in $lines) {
        if ($line.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            if (-not $found) {
                $result.Add($replacement)
                $found = $true
            }
        } else {
            $result.Add($line)
        }
    }

    if (-not $found) {
        if ($result.Count -gt 0 -and $result[$result.Count - 1] -ne "") { $result.Add("") }
        $result.Add($replacement)
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($FilePath, $result.ToArray(), $utf8NoBom)
}

try {
    Write-Step "Checking Python runtime"
    $python = Find-Python
    if (-not $python) {
        throw "Python was not found. Install Python 3.11 or newer, then run this setup again."
    }
    & $python --version

    Write-Step "Installing Python OCR packages"
    & $python -m pip install --disable-pip-version-check --upgrade pytesseract Pillow
    if ($LASTEXITCODE -ne 0) { throw "Python OCR package installation failed." }

    Write-Step "Checking Tesseract OCR"
    $tesseract = Find-Tesseract
    if (-not $tesseract) {
        $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
        if (-not $winget) {
            throw "Tesseract is not installed and winget is unavailable. Install the UB Mannheim Tesseract Windows build, then run this setup again."
        }
        Write-Host "Installing Tesseract OCR with winget..."
        & winget install --id UB-Mannheim.TesseractOCR --exact --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) { throw "winget could not install Tesseract OCR." }
        $tesseract = Find-Tesseract
        if (-not $tesseract) {
            throw "Tesseract installation finished, but tesseract.exe was not found. Restart Windows and run this setup again."
        }
    }

    Write-Host ("Tesseract: " + $tesseract) -ForegroundColor Green
    & $tesseract --version | Select-Object -First 2

    Write-Step "Saving OCR path for the backend"
    $envFile = Join-Path $PSScriptRoot "backend\.env"
    if (-not (Test-Path -LiteralPath $envFile)) {
        $example = Join-Path $PSScriptRoot "backend\.env.example"
        if (Test-Path -LiteralPath $example) {
            Copy-Item -LiteralPath $example -Destination $envFile -Force
        } else {
            New-Item -ItemType File -Path $envFile -Force | Out-Null
        }
    }

    # Forward slashes are accepted by Python and avoid Windows backslash escaping issues.
    $portablePath = $tesseract.Replace("\", "/")
    Set-EnvValue -FilePath $envFile -Name "TESSERACT_CMD" -Value $portablePath
    Write-Host ("Saved TESSERACT_CMD=" + $portablePath) -ForegroundColor Green

    Write-Step "Running OCR self-test"
    $test = & $tesseract --list-langs 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Tesseract self-test failed." }
    Write-Host $test

    Write-Step "Running backend OCR capability check"
    Push-Location (Join-Path $PSScriptRoot "backend")
    try {
        & $python -c "from app.engines.ocr_engine import capability; c=capability(); print(c.message); raise SystemExit(0 if c.available else 1)"
        if ($LASTEXITCODE -ne 0) { throw "Backend could not detect the OCR engine." }
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "OCR setup is ready." -ForegroundColor Green
    Write-Host "Close any running backend window, then run Start_All.bat again."
    exit 0
}
catch {
    Write-Host ""
    Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red
    Write-Host ""
    Write-Host "The installer stopped safely. Copy this error message if support is needed."
    exit 1
}
