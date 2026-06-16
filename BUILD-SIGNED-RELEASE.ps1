param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher",[string]$PrivateKeyPath=".\s9lab-updater.key",[string]$Password="")
$ErrorActionPreference='Stop';Set-Location $ProjectPath
$full=(Resolve-Path $PrivateKeyPath).Path;$env:TAURI_SIGNING_PRIVATE_KEY=[System.IO.File]::ReadAllText($full);$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=$Password
npm install;if($LASTEXITCODE-ne 0){throw 'npm install fehlgeschlagen'}
npm run tauri:build;if($LASTEXITCODE-ne 0){throw 'Build fehlgeschlagen'}
Start-Process explorer.exe (Join-Path $ProjectPath 'src-tauri\target\release\bundle')
