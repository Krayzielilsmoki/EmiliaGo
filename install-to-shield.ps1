param(
    [Parameter(Mandatory=$false)]
    [string]$ShieldIP = ""
)

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "$PSScriptRoot\EmiliaGO-debug.apk"

if (-not (Test-Path $adb)) {
    Write-Error "ADB not found at $adb"
    exit 1
}

if (-not (Test-Path $apk)) {
    $apk = "$PSScriptRoot\android\app\build\outputs\apk\debug\app-debug.apk"
}

if (-not $ShieldIP) {
    $ShieldIP = Read-Host "Enter your NVIDIA Shield Pro's IP address (Settings -> Device Preferences -> About -> Status -> IP address)"
}

Write-Host "Connecting to NVIDIA Shield Pro at $ShieldIP:5555..." -ForegroundColor Cyan
& $adb connect "$($ShieldIP):5555"

Write-Host "Waiting for you to click 'Allow' on the TV screen if prompted..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Installing EmiliaGO APK onto NVIDIA Shield Pro..." -ForegroundColor Green
& $adb -s "$($ShieldIP):5555" install -r $apk

Write-Host "Granting Camera permission automatically..." -ForegroundColor Cyan
& $adb -s "$($ShieldIP):5555" shell pm grant com.emiliago.app android.permission.CAMERA

Write-Host "Launching EmiliaGO on the TV!" -ForegroundColor Green
& $adb -s "$($ShieldIP):5555" shell am start -n com.emiliago.app/.MainActivity
