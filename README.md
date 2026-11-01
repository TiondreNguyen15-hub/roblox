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
