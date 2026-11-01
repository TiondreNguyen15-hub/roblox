[Current Roblox detection investigation and exact integration requirements](desktop/DETECTION-REPORT.md). The UI distinguishes configured targets, process presence, game identity, data connection, and ESP state.

## Current desktop: local backend edition

The latest desktop removes relay URLs and pairing controls and uses private Electron IPC. ESP/Aimbot tabs and real LAUNCH/STOP are retained. Published Roblox has no supported local player-data API: the app reports **integration required** and does not display fabricated live data. [Download Windows app](downloads/Blue-Menu-Windows.exe) · [Current guide](desktop/README.md). Older external integration source below is retained but is not used by this build.

## Current Windows application

The desktop app now has only ESP and Aimbot tabs, authorized Player Data API visualization, and real LAUNCH/STOP session control. [Download Windows app](downloads/Blue-Menu-Windows.exe) · [Desktop guide](desktop/README.md) · [Render/Roblox deployment](relay/README.md). Aimbot is an authorized target selector/marker, not automated gameplay input. Live game verification still requires deploying and pairing.

# Black & blue Roblox main menu

A simple menu with a dark background, blue Play button, rounded cards and buttons, hover/focus effects, and Settings and Credits panels. Buttons support mouse, touch, and gamepad activation.

## Install in Roblox Studio

1. Open your game in Roblox Studio.
2. In **Explorer → StarterPlayer → StarterPlayerScripts**, insert a **LocalScript** named `MainMenu`.
3. Paste the contents of `MainMenu.client.lua` into it.
4. Press **Play** to test.

Change `YOUR GAME` in the script to your game's name. Customize the credits text as needed.

**Play** closes the menu; it does not teleport players or implement a lobby. **Settings** toggles local shadows for the current session. The menu remains closed after respawning. Gameplay is not paused while it is open.

## Validation in Studio

- Confirm the menu fits desktop and phone viewports using the device emulator.
- Open Settings, toggle shadows, and go back.
- Open Credits and go back.
- Press Play and confirm the menu closes, then respawn and confirm it stays closed.

Roblox Studio is required to validate rendering and gameplay; these checks have not been run in the Linux cloud environment.

## In-game player tracking

The modular authoritative-server tracker is in [game-tracker](game-tracker/README.md). Download [the Roblox Studio demo place](downloads/Player-Tracking-Demo.rbxlx) or [the source ZIP](downloads/Player-Tracking-Source.zip). It includes boxes, player details, skeletons, radar, interpolation, and a settings menu.

## Published-game Player Data API

[Render deployment, Roblox setup, secure pairing, API contract, and live-test instructions](relay/README.md). The Render Blueprint defaults the configurable Universe ID to `10353139110`. The desktop retains the existing ESP until a valid game feed arrives.

The desktop Game Profile targets Place ID `79862723087324`. Configure/pair it in Settings; actual game identity comes from the authorized published-game feed.
