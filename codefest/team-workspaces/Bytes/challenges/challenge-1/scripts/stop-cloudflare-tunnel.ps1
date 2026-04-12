$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$previewPidFile = Join-Path $runtimeDir "preview.pid"
$tunnelPidFile = Join-Path $runtimeDir "cloudflared.pid"

foreach ($pidFile in @($tunnelPidFile, $previewPidFile)) {
    if (-not (Test-Path $pidFile)) {
        continue
    }

    $storedPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($storedPid) {
        $process = Get-Process -Id $storedPid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $storedPid
            Write-Output "Stopped process $storedPid"
        }
    }

    Remove-Item $pidFile -ErrorAction SilentlyContinue
}
