$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path .venv)) { python -m venv .venv }
$projectRoot = Split-Path $PSScriptRoot -Parent
$configFile = Join-Path $projectRoot ".env"
if (-not $env:DATABASE_URL -and -not (Test-Path $configFile) -and -not $env:DB_HOST) {
    $env:DATABASE_URL = "sqlite:///$($PSScriptRoot -replace '\\', '/')/operations.db"
}
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m uvicorn backend.main:app --app-dir .. --reload --host 127.0.0.1 --port 8000
