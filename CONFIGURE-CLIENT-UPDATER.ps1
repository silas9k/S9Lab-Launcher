param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher",[Parameter(Mandatory=$true)][string]$ClientJarUrl,[switch]$AllowInsecureHttp)
$ErrorActionPreference='Stop';$utf8=New-Object System.Text.UTF8Encoding($false)
if(-not $AllowInsecureHttp -and -not $ClientJarUrl.StartsWith('https://')){throw 'Client-Updates benötigen HTTPS.'}
$config=[ordered]@{enabled=$true;url=$ClientJarUrl;timeout_seconds=45;allow_insecure_http=[bool]$AllowInsecureHttp}
[System.IO.File]::WriteAllText((Join-Path $ProjectPath 'src-tauri\client-update.json'),($config|ConvertTo-Json),$utf8)
Write-Host 'Client-Updater aktiviert. Ab jetzt nur noch s9labclient-latest.jar auf dem Server ersetzen.'
