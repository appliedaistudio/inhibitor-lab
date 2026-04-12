$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$previewLog = Join-Path $runtimeDir "preview.log"
$previewErr = Join-Path $runtimeDir "preview.err.log"
$previewPidFile = Join-Path $runtimeDir "preview.pid"
$tunnelLog = Join-Path $runtimeDir "cloudflared.log"
$tunnelErr = Join-Path $runtimeDir "cloudflared.err.log"
$tunnelPidFile = Join-Path $runtimeDir "cloudflared.pid"
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (-not (Test-Path $cloudflaredPath)) {
    throw "cloudflared.exe was not found at $cloudflaredPath."
}

if (Test-Path $previewPidFile) {
    $existingPreviewPid = Get-Content $previewPidFile -ErrorAction SilentlyContinue
    if ($existingPreviewPid) {
        $existingPreview = Get-Process -Id $existingPreviewPid -ErrorAction SilentlyContinue
        if ($existingPreview) {
            throw "Preview server is already running with PID $existingPreviewPid."
        }
    }
}

if (Test-Path $tunnelPidFile) {
    $existingTunnelPid = Get-Content $tunnelPidFile -ErrorAction SilentlyContinue
    if ($existingTunnelPid) {
        $existingTunnel = Get-Process -Id $existingTunnelPid -ErrorAction SilentlyContinue
        if ($existingTunnel) {
            throw "Cloudflare tunnel is already running with PID $existingTunnelPid."
        }
    }
}

Remove-Item $previewLog, $previewErr, $tunnelLog, $tunnelErr -ErrorAction SilentlyContinue

$preview = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "preview", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $previewLog `
    -RedirectStandardError $previewErr `
    -PassThru

$preview.Id | Set-Content $previewPidFile

$previewReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4173" -TimeoutSec 2
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $previewReady = $true
            break
        }
    } catch {
    }
}

if (-not $previewReady) {
    throw "Preview server did not become ready on http://127.0.0.1:4173."
}

$tunnel = Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList @("tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:4173", "--logfile", $tunnelLog) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError $tunnelErr `
    -PassThru

$tunnel.Id | Set-Content $tunnelPidFile

$publicUrl = $null
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    foreach ($logPath in @($tunnelLog, $tunnelErr)) {
        if (-not (Test-Path $logPath)) {
            continue
        }

        $match = Select-String -Path $logPath -Pattern "https://[-a-z0-9]+\.trycloudflare\.com" -AllMatches -ErrorAction SilentlyContinue
        if ($match) {
            $publicUrl = $match.Matches[-1].Value
            break
        }
    }
    if ($publicUrl) {
        break
    }
}

if (-not $publicUrl) {
    throw "Cloudflare tunnel started, but no public URL was found in $tunnelLog."
}

Write-Output "Preview PID: $($preview.Id)"
Write-Output "Tunnel PID: $($tunnel.Id)"
Write-Output "Local URL: http://127.0.0.1:4173"
Write-Output "Public URL: $publicUrl"
