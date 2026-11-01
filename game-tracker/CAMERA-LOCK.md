# Through-wall ESP and camera locks for your Roblox experience

Install this code **inside a Roblox Studio project you own or may modify**. It uses the project's existing server-authorized PlayerTracking snapshots. It is not a script for the desktop Lua 5.3 sandbox; Roblox services, CFrames, GUI instances, and camera controls require the Roblox engine.

## Quick install

Open `downloads/Player-Tracking-Demo.rbxlx` in Studio, or use the source ZIP. To update your own experience, replace the PlayerTracking folders in ReplicatedStorage, ServerScriptService, and StarterPlayer/StarterPlayerScripts with the supplied versions. Install only one copy of the client entry script. Keep all sibling modules: `Tracking.client.lua` is the LocalScript entry point, not a standalone executor snippet.

Add authorized viewer UserIds to `shared/Config.lua` before publishing. Studio test clients and the individual experience creator are authorized by default; group experiences require explicit viewer IDs. The server decides who receives snapshots. No desktop relay is required for this in-game feature; the optional HTTP export remains disabled by default.

## Controls

| Control | Behavior |
| --- | --- |
| Q / Snap lock button | Acquire the closest eligible screen-center target and track it instantly. Press Q again to release. |
| T / Target lock button | Acquire the closest eligible target and track that same player smoothly. Press T again to release. |
| X / Release lock button | Release either lock. |
| Right Shift / TRACKING MENU | Open ESP/lock configuration. |

Locking preserves the camera position and rotates it toward the selected player's head, or root when head data is absent. It does not fire, alter hit registration, move the character, or use prediction. It requires an alive local character and Roblox's Custom camera mode. It will not take over Scriptable/cutscene cameras.

Once acquired, the lock stays on that player, rather than jumping to whichever player becomes nearer to the crosshair. It releases when authorization/tracking is disabled, the target dies/leaves/respawns, snapshots expire, distance exceeds the configured limit, the camera mode changes, or the line-of-sight check fails. Normal camera updates resume when the lock is released. In custom camera projects, test interaction with your own camera controller; this implementation binds immediately after Roblox's Camera render priority.

## ESP

- Boxes and skeletons are screen-space Roblox GUI drawings and remain visible through walls.
- WallHighlights adds `Highlight` instances with `AlwaysOnTop` depth mode for character fill/outline through occluding geometry.
- Highlights require the target character to be replicated to the viewer. With streaming, boxes/skeletons can use authorized server snapshots while an unstreamed character has no Highlight adornment.
- R6 and R15 rigs are supported. Skeletons connect sampled part centers and require `StreamSkeleton=true`.
- Menu toggles control boxes, names, distance, health, skeletons, wall highlights, radar, and colors. Tracking's master Enabled toggle also releases camera locks.

## Config defaults

`LockRadiusPixels=150`, `LockMaxDistance=1500`, `LockSmoothing=14`, `LockTeamCheck=true`, and `LockRequireLineOfSight=true`. New targets must initially be on screen and within the selection radius. Radius is an acquisition filter, not a reason to swap an already locked player. Instant snap and smooth tracking share the same target filters. The line-of-sight filter applies to both acquisition and continued locking; ESP may show an occluded player while the default camera lock refuses it.

Keys are editable in Config. Skeleton and wall highlights now default on for this add-on. Team checking excludes non-neutral teammates. Colors include a separate Wall fill color and Box outline color. Client-only Highlights are destroyed when the pooled renderer entry is removed or the tracker is cleaned up.

## Validation

All 16 Luau source files compile with the official Luau compiler. The actual CameraLock module passed tests using explicit Roblox service/math doubles for acquisition, snap/smooth interpolation, stable target selection, key-mode release behavior, team/radius checks, line-of-sight, authorization, camera mode, disable, respawn/death/stale removal, and render-binding cleanup. Existing store/projection tests still pass.

These tests do not execute Roblox Studio. Actual camera control, Highlight rendering through geometry, streaming behavior, and multi-client gameplay remain **unverified** here. In Studio, use Server & Clients with two clients, create a wall, test R6/R15 characters and each toggle/key, revoke viewer authorization, kill/respawn the target, change teams, and test your camera controller before publishing.

## One-file installer

`downloads/Roblox-ESP-All-In-One.lua` contains all 16 Roblox source components in one Lua file. In your own authorized project, stop Play mode, open **View → Command Bar** in Roblox Studio, paste the entire file there, and execute it. It creates the shared/server/client folders in their correct services. Run Server & Clients with two clients to test.

It refuses to run outside Studio Edit mode and refuses to overwrite an existing tracker by default. If updating an old installation, preserve your viewer IDs/custom settings, then explicitly set `REPLACE_EXISTING = true` at the top before running. Existing folders are moved to a uniquely named ServerStorage backup and their old scripts are disabled; prior Disabled states are recorded as attributes. Restore authorization/custom settings deliberately in the new Config before publishing. Native Studio installation/rendering remains unverified here.

This is **one installer code**, not one combined client/server runtime. Roblox still requires server authorization and client rendering/camera logic to run in different contexts. Source is staged before changing your project, and Studio history waypoints bracket installation. Rebuild it from source with `python build_single_installer.py`.

The desktop Load Script button can open this `.lua` as text, but the desktop Run button cannot install or execute Roblox components. Use the Studio Command Bar for this installer.
