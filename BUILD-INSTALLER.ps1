param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher")
$ErrorActionPreference='Stop';Set-Location $ProjectPath
npm install;if($LASTEXITCODE-ne 0){throw 'npm install fehlgeschlagen'}
npm run build;if($LASTEXITCODE-ne 0){throw 'Frontend-Build fehlgeschlagen'}
npm run tauri:build -- --bundles nsis;if($LASTEXITCODE-ne 0){throw 'Installer-Build fehlgeschlagen'}
Start-Process explorer.exe (Join-Path $ProjectPath 'src-tauri\target\release\bundle\nsis')
