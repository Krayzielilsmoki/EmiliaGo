Add-Type -AssemblyName System.IO.Compression.FileSystem

function List-IndexJs($path) {
    Write-Host "Checking: $path"
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -like "*index*") {
            Write-Host "  $($entry.FullName) ($($entry.Length) bytes, $($entry.LastWriteTime))"
        }
    }
    $zip.Dispose()
}

List-IndexJs "C:\Users\Home\.gemini\antigravity\scratch\EmiliaGO\android\app\build\outputs\apk\debug\app-debug.apk"
List-IndexJs "C:\Users\Home\.gemini\antigravity\scratch\EmiliaGO\EmiliaGO-debug.apk"
