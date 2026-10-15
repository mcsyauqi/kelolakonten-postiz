# Stops everything started by scripts/start-local.ps1 (Temporal, backend, orchestrator, frontend).
# Only node/temporal processes on the Kelola Konten ports are stopped; PostgreSQL and Redis keep running.
$repo = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repo '.env'

$backendPort = 3000
if (Test-Path $envFile) {
  $backendUrl = (Select-String -Path $envFile -Pattern '^\s*NEXT_PUBLIC_BACKEND_URL\s*=\s*"?([^"\s]+)' | Select-Object -First 1).Matches.Groups[1].Value
  if ($backendUrl) { $backendPort = ([Uri]$backendUrl).Port }
  $portSetting = (Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1).Matches.Groups[1].Value
  if ($portSetting) { $backendPort = [int]$portSetting }
}

$stopped = 0
foreach ($port in @(7233, 8233, $backendPort, 3002, 4200)) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -in @('node', 'temporal')) {
      Write-Host "Stopping $($proc.ProcessName) (PID $($proc.Id)) on port $port"
      taskkill /PID $proc.Id /T /F | Out-Null
      $stopped++
    }
  }
}

# Windows left over from the older version of start-local.ps1, titled "kelolakonten: ...".
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -like "*WindowTitle = 'kelolakonten:*" } |
  ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null; $stopped++ }

Write-Host "Stopped $stopped process(es)."
