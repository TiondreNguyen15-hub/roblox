# Blue Menu — Windows desktop app

A standalone black and blue menu with rounded buttons. Play opens a welcome panel; no Roblox game is connected. Settings saves the reduce animations preference locally. Credits, Back, and Escape provide navigation.

## Run the Windows app

Download `Blue-Menu-Windows.exe` and double-click it. It is a portable app for Windows x64 and does not require installation. The app is unsigned.

## Develop

Use Node.js 22 or newer. From this directory:

```sh
npm ci
npm start
```

Build a Windows portable executable:

```sh
npm run build -- --win --x64
```

Output: `dist/Blue Menu 1.0.0.exe`.

The interface was checked in Chromium for Play, Credits, Back, Escape, saved settings, and a narrow window. Windows executable startup must be verified on Windows.

ESP and Aim are visual menu sections with a local preview only. ESP includes boxes, names, and distance toggles. Aim includes crosshair and circle toggles plus a circle size slider. Preview preferences are saved locally.
