param(
 [string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher",
 [Parameter(Mandatory=$true)][string]$LauncherEndpoint,
 [Parameter(Mandatory=$true)][string]$UpdaterPublicKey,
 [Parameter(Mandatory=$true)][string]$ClientJarUrl,
 [Parameter(Mandatory=$true)][string]$BackendApiUrl,
 [switch]$AllowInsecureHttp
)
$ErrorActionPreference='Stop'
foreach($url in @($LauncherEndpoint,$ClientJarUrl,$BackendApiUrl)){if(-not $AllowInsecureHttp -and -not $url.StartsWith('https://')){throw "Nur HTTPS erlaubt: $url"}}
$tauriPath=Join-Path $ProjectPath 'src-tauri\tauri.conf.json';$tauri=Get-Content $tauriPath -Raw|ConvertFrom-Json
if(-not $tauri.plugins){$tauri|Add-Member NoteProperty plugins ([pscustomobject]@{})}
$updater=[pscustomobject]@{pubkey=$UpdaterPublicKey;endpoints=@($LauncherEndpoint);windows=[pscustomobject]@{installMode='passive'}}
$tauri.plugins|Add-Member -Force NoteProperty updater $updater
$tauri.bundle|Add-Member -Force NoteProperty createUpdaterArtifacts $true
$tauri|ConvertTo-Json -Depth 30|Set-Content $tauriPath -Encoding UTF8
@{enabled=$true;url=$ClientJarUrl;timeout_seconds=45;allow_insecure_http=[bool]$AllowInsecureHttp}|ConvertTo-Json|Set-Content (Join-Path $ProjectPath 'src-tauri\client-update.json') -Encoding UTF8
@{base_url=$BackendApiUrl.TrimEnd('/');allow_insecure_http=[bool]$AllowInsecureHttp}|ConvertTo-Json|Set-Content (Join-Path $ProjectPath 'src-tauri\backend-integration.json') -Encoding UTF8
Write-Host 'Update-Quellen und Backend wurden konfiguriert.'
