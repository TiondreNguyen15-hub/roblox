# Lua Script Input

The Lua Scripts section adds an actual local editor, file/library management, and isolated Lua execution to Blue Menu. Existing ESP/Aimbot and LAUNCH/STOP functionality remains separate.

## What runs here

**Run executes standard Lua 5.3 in a local sandbox. It does not run inside Roblox Studio or the Roblox desktop client.** Roblox APIs (`game`, `Instance`, `task`, etc.) and Luau-only syntax are unavailable. Editing and saving Roblox/Luau source is supported as text, but Roblox-specific execution must be performed in your own authorized Studio project using Studio's normal tools.

The project name and authorization checkbox record the user's declared scope; they do not verify ownership or grant access to a game. The sandbox has no game connection, process-injection mechanism, or ability to modify a running experience. No DLL injection, executor, anti-cheat bypass, or unauthorized game modification is provided.

## Use the editor

1. Open **Lua Scripts**. Enter a script name and the name of the project you own or may modify.
2. Paste/type code in the editor. Lua keywords, strings, numbers, and comments are highlighted; line numbers and Tab indentation are supported. Highlighting uses text nodes, not executable HTML.
3. Confirm project authorization, then click **Run**. Output appears below the editor; status reports completion or errors with the Lua-reported line number. Clicking Run never launches code inside Roblox.
4. **Stop** terminates the child process immediately. Global system STOP and closing the app also stop script execution. Infinite loops are limited independently of manual Stop.
5. **Load Script** opens a native `.lua` picker. Files are loaded as text only and never autorun. Maximum source size is 256 KB.
6. **Save Script** opens a native `.lua` save dialog and saves a managed library copy. The **Saved scripts** list switches between those saved copies. The library survives restarts under Electron's userData `lua-scripts` folder. Unsaved switches prompt before discarding changes.
7. **New** clears the editor after confirming unsaved edits. Opening another script resets the authorization checkbox. Editing/loading/switching is disabled during a run so error lines refer to the executed source.

Scripts and project labels are stored locally as ordinary source/JSON files, not encrypted credentials. The Lua VM cannot read the script library; only the native editor file operations can. Save dialogs explicitly authorize file writes. A saved `.lua` can be opened or synced into your authorized Studio/Rojo project, where you can test Roblox-specific behavior using Studio.

## Sandbox architecture

Trusted main-frame IPC → ScriptService → separate child process → Fengari Lua VM.

Only base functions and math/string/table/utf8 libraries are opened. `io`, `os`, `package`, `require`, `debug`, `load`, `loadfile`, `dofile`, and JavaScript interop are unavailable. No host object, process environment, file handle, network API, player feed, or game integration is passed to Lua. Binary chunks are rejected. The VM's print function returns bounded text over a private parent/child channel; output cannot invoke application commands.

Each run creates a fresh process; globals do not persist between runs. One run at a time is allowed. Native Stop hard-terminates the process and ignores late results. Execution has a one-million-instruction budget, five-second parent watchdog, 64 KB output cap, 8 KB print-value/error bounds, bounded string repetition/format widths, and a 64 MB V8 heap flag. Sandbox limit helpers capture their functions privately so overwriting Lua globals cannot disable their checks.

These are language-capability and application resource controls, **not a full OS container or a guaranteed total resident-memory ceiling**. Use the environment for trusted, authorized project logic rather than hostile multi-tenant code. Heap exhaustion, forced Stop, and timeouts may not have a source line; the UI reports the reason instead of inventing a line number.

## Files and packaging

- `lua-editor.js` / `lua-highlight.js`: editing, highlighting, list switching, and output/status rendering.
- `script-service.js`: native file dialogs/library, project-scope gate, process lifecycle, time/output limits.
- `lua-runner.js`: restricted Lua VM inside the child process.
- `main.js` / `preload.js`: fixed IPC methods with main-frame validation and shutdown cleanup.

Fengari is pinned in package.json/package-lock.json. The runner and production modules are unpacked from ASAR because the Windows build starts the Electron executable in Node mode for that isolated child. No arbitrary executable path or source code is interpolated into a shell command; source travels as an IPC message. Native file dialogs constrain ordinary Load/Save operations to `.lua`.

## Validation

`npm test` includes actual isolated Lua runs, expected syntax/runtime errors with line numbers, blocked host/Roblox capabilities, instruction/string/output/time limits, resistant limit helpers, duplicate-run protection, Stop/late-result rejection, source/ID validation, and real filesystem/library round trips.

`python lua-ui.test.py` exercises the editor against actual ScriptService, real Lua child processes, and real file operations. Native dialog choices are test adapters. It verifies highlighting, authorization gating, Run/output, Save/Load/list switching, error-line display, Stop, and narrow layouts. It requires the same local test server, Playwright, and Chromium as the other UI tests. Existing backend and ESP/Aimbot UI regression tests also pass.

The packaged unpacked runner/dependencies were additionally executed with Node on Linux. **Native Windows Electron RunAsNode spawning, Windows file dialogs, and app startup remain unverified here.** No Roblox Studio or live-game script execution is claimed.

## Load Script troubleshooting update

The unsaved-edits prompt now uses native main-process `dialog.showMessageBox` through a fixed IPC method; browser `window.confirm` is not used. Confirmation is inside the button's error handler. The main window is restored/focused before opening the native file picker, and the status is shown above the toolbar so it is visible when clicked. Canceling confirms that no file was loaded; picker and read failures have `LOAD_DIALOG_FAILED` and `LOAD_READ_FAILED` codes. Missing/outdated preload bridges report an update error rather than silently exiting. Fully exit an old running app before opening the updated portable executable.

Tests cover keeping dirty edits, confirming discard, confirmation errors, picker cancellation, failed dialog/read operations, foreground-owner activation, and successfully loading real `.lua` contents. Native Windows dialog behavior remains unverified here. ZIP archives must be extracted; Load Script accepts a `.lua` file, not the ZIP itself.
