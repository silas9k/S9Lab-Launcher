param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher",[Parameter(Mandatory=$true)][string]$LauncherEndpoint,[Parameter(Mandatory=$true)][string]$UpdaterPublicKey)
$ErrorActionPreference='Stop';$utf8=New-Object System.Text.UTF8Encoding($false)
if(-not $LauncherEndpoint.StartsWith('https://')){throw 'Launcher-Endpoint muss HTTPS verwenden.'}
$cfgPath=Join-Path $ProjectPath 'src-tauri\tauri.conf.json';$cfg=[System.IO.File]::ReadAllText($cfgPath)|ConvertFrom-Json
if(-not $cfg.PSObject.Properties['plugins']){$cfg|Add-Member NoteProperty plugins ([pscustomobject]@{})}
$up=[pscustomobject]@{pubkey=$UpdaterPublicKey;endpoints=@($LauncherEndpoint);windows=[pscustomobject]@{installMode='passive'}}
$cfg.plugins|Add-Member -Force NoteProperty updater $up
if(-not $cfg.PSObject.Properties['bundle']){$cfg|Add-Member NoteProperty bundle ([pscustomobject]@{})}
$cfg.bundle|Add-Member -Force NoteProperty createUpdaterArtifacts $true
[System.IO.File]::WriteAllText($cfgPath,($cfg|ConvertTo-Json -Depth 100),$utf8)
$libPath=Join-Path $ProjectPath 'src-tauri\src\lib.rs';$lib=[System.IO.File]::ReadAllText($libPath)
$lib=$lib -replace '(?m)^\s*// S9LAB_UPDATER_DISABLED: \.plugin\(tauri_plugin_updater::Builder::new\(\)\.build\(\)\)\s*$','        .plugin(tauri_plugin_updater::Builder::new().build())'
[System.IO.File]::WriteAllText($libPath,$lib,$utf8)
[System.IO.File]::WriteAllText((Join-Path $ProjectPath 'src\updater-config.ts'),'export const LAUNCHER_UPDATER_ENABLED = true;'+[Environment]::NewLine,$utf8)
Remove-Item (Join-Path $ProjectPath 'src-tauri\target') -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Launcher-Updater vollständig aktiviert.'
