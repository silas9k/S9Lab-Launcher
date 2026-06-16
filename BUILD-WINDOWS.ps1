$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm wurde nicht gefunden."
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw "Rust/Cargo wurde nicht gefunden."
}

npm install
npm run build
npm run tauri:build

Write-Host "Build abgeschlossen. Installer: src-tauri\target\release\bundle" -ForegroundColor Green
