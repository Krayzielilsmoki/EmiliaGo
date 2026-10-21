$src = 'C:\Users\Home\.gemini\antigravity\scratch\EmiliaGO\android\app\build\outputs\apk\debug\app-debug.apk'
$dest = 'C:\Users\Home\.gemini\antigravity\scratch\EmiliaGO\EmiliaGO-debug.apk'
Copy-Item $src $dest -Force
Write-Host "Copied APK to $dest"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb connect '192.168.86.47:5555'
& $adb -s '192.168.86.47:5555' install -r $dest
