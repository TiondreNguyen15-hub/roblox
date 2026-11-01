# Blue Menu — Windows desktop app

A standalone black and blue menu with rounded buttons. Play opens a dashboard with ESP, Aim, and an application picker. No Roblox game data is connected. Settings saves the reduce animations preference locally. Credits, Back, and Escape provide navigation.

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

## Application capture

Press Play, then Choose Application. The Windows app lists capturable open application windows on the computer where it is running. Select a window to start a local video preview. Stop Capture or return to the main menu to stop it. Capture continues while visiting ESP and Aim. Refresh Windows updates the list; closed or protected windows may not be capturable. No audio is captured and no video is recorded or uploaded.

Window selection is implemented using Electron desktopCapturer with a sandboxed preload bridge. Browser checks used simulated window listings and a generated video stream to verify navigation, capture start/stop, and failures. Native application enumeration and capture require testing on Windows.

Actual player detection and boxes around players in captured games are not implemented. The ESP box remains a labeled visual preview; connecting game-position data or a suitable detection system is separate work.
