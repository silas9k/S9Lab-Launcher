param([string]$ProjectPath="C:\Users\silas\Documents\s9lab\S9Lab-Launcher")
$ErrorActionPreference='Stop';Set-Location $ProjectPath
npm run tauri signer generate -- -w "$ProjectPath\s9lab-updater.key"
Write-Host 'Privaten Key niemals veröffentlichen. Den ausgegebenen Public Key für den nächsten Schritt kopieren.'
