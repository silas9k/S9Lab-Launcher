# S9Lab Launcher

Komplett neuer Desktop-Launcher für den S9Lab Minecraft Client, gebaut mit **Tauri 2**, **Rust**, **React** und **TypeScript**.

## Enthalten

- Microsoft Device-Code Login mit der registrierten S9Lab App-ID
- Xbox Live, XSTS und Minecraft Services Authentifizierung
- mehrere Microsoft-/Minecraft-Accounts
- automatische Erneuerung abgelaufener Minecraft-Tokens
- sichere Token-Ablage im Windows-Anmeldeinformationsspeicher
- Migration des Accounts aus dem alten S9LAB Launcher
- automatische Installation von Minecraft 1.21.11, Assets, Libraries, Natives und Fabric
- integrierte Fabric API, GeckoLib und S9Lab Client Mod
- Java-21-Erkennung
- Starten, Stoppen, Reparieren und Live-Logs
- vollständig neues S9Lab UI und neues Launcher-Icon

## Entwicklung starten

Voraussetzungen: Node.js, Rust und die Tauri-Voraussetzungen für Windows.

```powershell
npm install
npm run tauri:dev
```

Oder direkt:

```powershell
.\START-DEV.ps1
```

## Windows Installer bauen

```powershell
npm install
npm run tauri:build
```

Oder:

```powershell
.\BUILD-WINDOWS.ps1
```

Die Installer liegen danach unter `src-tauri\target\release\bundle`.

## Sicherheit

Die Microsoft-App-ID ist eine öffentliche Client-ID und darf im Desktop-Client enthalten sein. Es wird **kein Client Secret** verwendet. Refresh- und Minecraft-Tokens werden nicht in `localStorage` oder in Klartext-Konfigurationsdateien abgelegt, sondern pro Account im Windows-Anmeldeinformationsspeicher gespeichert.

## Spielordner

Standardmäßig verwendet der Launcher:

```text
%APPDATA%\S9Lab Launcher\minecraft
```

Eigene Mods werden nicht gelöscht. Der Launcher entfernt nur Dateien, die er selbst über `.s9lab-managed-mods.json` verwaltet.
