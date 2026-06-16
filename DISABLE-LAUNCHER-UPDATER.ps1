param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher")
$ErrorActionPreference='Stop';$utf8=New-Object System.Text.UTF8Encoding($false)
$libPath=Join-Path $ProjectPath 'src-tauri\src\lib.rs';$lib=[System.IO.File]::ReadAllText($libPath)
$lib=$lib -replace '(?m)^\s*\.plugin\(tauri_plugin_updater::Builder::new\(\)\.build\(\)\)\s*$','        // S9LAB_UPDATER_DISABLED: .plugin(tauri_plugin_updater::Builder::new().build())'
[System.IO.File]::WriteAllText($libPath,$lib,$utf8)
foreach($cfgPath in @((Join-Path $ProjectPath 'src-tauri\tauri.conf.json'),(Join-Path $ProjectPath 'src-tauri\tauri.windows.conf.json'))){if(Test-Path $cfgPath){$cfg=[System.IO.File]::ReadAllText($cfgPath)|ConvertFrom-Json;if($cfg.PSObject.Properties['plugins'] -and $cfg.plugins -and $cfg.plugins.PSObject.Properties['updater']){$cfg.plugins.PSObject.Properties.Remove('updater')};[System.IO.File]::WriteAllText($cfgPath,($cfg|ConvertTo-Json -Depth 100),$utf8)}}
[System.IO.File]::WriteAllText((Join-Path $ProjectPath 'src\updater-config.ts'),'export const LAUNCHER_UPDATER_ENABLED = false;'+[Environment]::NewLine,$utf8)
Remove-Item (Join-Path $ProjectPath 'src-tauri\target') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Launcher-Updater deaktiviert; Client-Updater bleibt erhalten.'
