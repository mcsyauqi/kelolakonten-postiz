# Starts Kelola Konten for local development on Windows, in the background (no windows):
# Temporal (7233, UI 8233), backend (port from NEXT_PUBLIC_BACKEND_URL), orchestrator (3002), frontend (4200).
#
#   scripts\start-local.ps1                   start from the last builds (light: about 2 GB RAM in total)
#   scripts\start-local.ps1 -Build            rebuild backend, orchestrator and frontend first (after pulling or changing code)
#   scripts\start-local.ps1 -FrontendDev      run the frontend as a dev server with hot reload (heavy: about 5 GB RAM)
#   scripts\start-local.ps1 -NoOrchestrator   skip the orchestrator (UI work only; scheduling/publishing won't run)
#   scripts\stop-local.ps1                    stop everything
#
# Requires PostgreSQL and Redis already running and .env filled (see docs/MENJALANKAN-LOKAL.md).
# Temporal data and logs live outside the repo, in %USERPROFILE%\.kelolakonten-dev
param(
  [switch]$Build,
  [switch]$FrontendDev,
  [switch]$NoOrchestrator
)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$dev = Join-Path $env:USERPROFILE '.kelolakonten-dev'
$logs = Join-Path $dev 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$envFile = Join-Path $repo '.env'
if (-not (Test-Path $envFile)) { throw ".env not found in $repo. Copy the template from docs/MENJALANKAN-LOKAL.md first." }

# Backend port: PORT from .env, otherwise the port in NEXT_PUBLIC_BACKEND_URL
# (behind a tunnel that URL is https on 443, so PORT is required there).
$backendUrl = (Select-String -Path $envFile -Pattern '^\s*NEXT_PUBLIC_BACKEND_URL\s*=\s*"?([^"\s]+)' | Select-Object -First 1).Matches.Groups[1].Value
if (-not $backendUrl) { throw 'NEXT_PUBLIC_BACKEND_URL is missing in .env' }
$portSetting = (Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1).Matches.Groups[1].Value
$backendPort = if ($portSetting) { [int]$portSetting } else { ([Uri]$backendUrl).Port }
if ($backendPort -in @(80, 443)) { throw "Backend would listen on port $backendPort. Add PORT=3042 (or another free port) to .env." }

$temporal = Get-Command temporal -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $temporal) {
  $temporal = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter temporal.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $temporal) { throw 'temporal.exe not found. Install it with: winget install Temporal.TemporalCLI' }

& (Join-Path $PSScriptRoot 'stop-local.ps1')

$node = (Get-Command node).Source
$dotenv = Join-Path $repo 'node_modules\dotenv-cli\cli.js'
$nest = Join-Path $repo 'node_modules\@nestjs\cli\bin\nest.js'
$next = Join-Path $repo 'node_modules\next\dist\bin\next'

# Same entry points as the "start" scripts in apps/backend and apps/orchestrator package.json.
$apps = @(
  @{ Name = 'backend'; Dir = "$repo\apps\backend"; Main = 'dist\apps\backend\src\main.js' }
)
if (-not $NoOrchestrator) {
  $apps += @{ Name = 'orchestrator'; Dir = "$repo\apps\orchestrator"; Main = 'dist\apps\orchestrator\src\main.js' }
}

# Build one app at a time to keep memory use down; skip when a build already exists.
foreach ($app in $apps) {
  if ($Build -or -not (Test-Path (Join-Path $app.Dir $app.Main))) {
    Write-Host "Building $($app.Name) (a few minutes)..."
    Push-Location $app.Dir
    try {
      & $node $nest build
      if ($LASTEXITCODE -ne 0) { throw "Build of $($app.Name) failed" }
    } finally { Pop-Location }
  }
}

# The production frontend build inlines NEXT_PUBLIC_* values from .env, so rebuild after changing them.
$frontendDir = "$repo\apps\frontend"
if (-not $FrontendDev -and ($Build -or -not (Test-Path "$frontendDir\.next\BUILD_ID"))) {
  Write-Host 'Building frontend (about 5 minutes)...'
  Push-Location $frontendDir
  try {
    $env:NODE_OPTIONS = '--max-old-space-size=4096'
    # Start-Process instead of "&": Windows PowerShell can drop the "--" separator when calling native commands.
    $p = Start-Process -FilePath $node -ArgumentList "`"$dotenv`" -e ../../.env -- `"$node`" `"$next`" build" -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw 'Build of frontend failed' }
  } finally {
    Remove-Item Env:\NODE_OPTIONS -ErrorAction SilentlyContinue
    Pop-Location
  }
}

function Start-Hidden($name, $workdir, $file, $arguments) {
  $out = Join-Path $logs "$name.log"
  $err = Join-Path $logs "$name.error.log"
  Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $workdir -WindowStyle Hidden `
    -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

Start-Hidden 'temporal' $dev $temporal "server start-dev --port 7233 --ui-port 8233 --db-filename `"$dev\temporal.db`" --log-level warn"
Start-Sleep -Seconds 5

$env:PORT = "$backendPort"
foreach ($app in $apps) {
  Start-Hidden $app.Name $app.Dir $node "`"$dotenv`" -e ../../.env -- `"$node`" --experimental-require-module $($app.Main)"
}
Remove-Item Env:\PORT

if ($FrontendDev) {
  # --webpack: Turbopack dev serves 404 for every route on Windows. Needs about 5 GB; a 2 GB heap cap crashes it.
  Start-Hidden 'frontend' $frontendDir $node "`"$dotenv`" -e ../../.env -- `"$node`" `"$next`" dev --webpack -p 4200"
} else {
  Start-Hidden 'frontend' $frontendDir $node "`"$dotenv`" -e ../../.env -- `"$node`" `"$next`" start -p 4200"
}

Write-Host 'Waiting for the backend...'
$deadline = (Get-Date).AddMinutes(5)
do {
  Start-Sleep -Seconds 3
  try { $ok = (Invoke-WebRequest "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { $ok = $false }
} until ($ok -or (Get-Date) -gt $deadline)

Write-Host ''
if ($ok) { Write-Host "Ready. App: http://localhost:4200  API: $backendUrl  Temporal UI: http://localhost:8233" }
else { Write-Host "Backend did not answer within 5 minutes. Check $logs\backend.error.log" }
if ($FrontendDev) { Write-Host 'Dev frontend: the first visit to each page compiles for up to a minute or two.' }
Write-Host 'Stop with: scripts\stop-local.ps1'
Write-Host "Logs: $logs"
