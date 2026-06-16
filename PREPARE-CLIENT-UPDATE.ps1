param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher",[Parameter(Mandatory=$true)][string]$JarPath)
$ErrorActionPreference='Stop';if(-not(Test-Path $JarPath)){throw "JAR nicht gefunden: $JarPath"}
$bytes=[System.IO.File]::ReadAllBytes($JarPath);if($bytes.Length -lt 32768 -or $bytes[0] -ne 80 -or $bytes[1] -ne 75){throw 'Datei ist keine gültige JAR.'}
$out=Join-Path $ProjectPath 'client-update-upload';New-Item -ItemType Directory -Force -Path $out|Out-Null
Copy-Item $JarPath (Join-Path $out 's9labclient-latest.jar') -Force
Get-FileHash (Join-Path $out 's9labclient-latest.jar') -Algorithm SHA256
Start-Process explorer.exe $out
