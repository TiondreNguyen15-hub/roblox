# Authoritative Roblox player tracking

An in-game tracking system for your own Roblox experience. Server snapshots supply character transforms, health, team, and optional rig positions. The client interpolates snapshots and draws standard Roblox GUI objects. It does not require the desktop app, capture, ONNX, injection, or internet access.

## Open the demo

Download `downloads/Player-Tracking-Demo.rbxlx` from this repository, then open it with Roblox Studio. Use **Test → Server & Clients** with at least two clients; your own character is intentionally excluded. All Studio test viewers are authorized. A single-player test has no other player to draw.

The place contains a floor, spawn, and the source modules below. Opening and running the generated place in Studio is still required to validate actual rendering.

## Install in an existing game

Copy these folders from the demo place into the matching services in your own place, preserving their names:

| Destination | Folder | Contents |
| --- | --- | --- |
| ReplicatedStorage | PlayerTracking | Config and Rig ModuleScripts |
| ServerScriptService | PlayerTrackingServer | Tracking server Script |
| StarterPlayer → StarterPlayerScripts | PlayerTrackingClient | Tracking LocalScript and seven ModuleScripts |

Alternatively, sync `default.project.json` with your existing Rojo workflow. The source ZIP includes the same layout. Ordinary `.lua` files are ModuleScripts, `.server.lua` is a Script, and `.client.lua` is a LocalScript.

Before publishing, edit **Config.AllowedUserIds** to include authorized viewer IDs. Production viewers are denied by default except the individual experience creator. Group-owned experiences require explicit IDs. Set `AllowAllViewers = true` only when tracking is intended for every player. Authorization is enforced when the server sends snapshots, not by the menu. There is no client request that grants access.

## Controls and features

Click **TRACKING · MENU** or press **Right Shift**. The menu includes enable/disable, boxes, names, distance in studs, health text/bar, team labels, R6/R15 skeletons, radar, team filtering, team colors, radar range/size, maximum distance, and separate box/text/skeleton/radar color palettes. Settings are local to the session. Arbitrary starting RGB values can be set in `Config.Colors`.

Team colors override the custom box and radar colors while enabled. Turn UseTeamColors off to use those custom colors. The radar rotates with the camera, plots horizontal positions relative to your character (or spectator camera), and shows each tracked character's heading. It includes players behind the camera within range.

## Data and update flow

1. The server enumerates connected players and snapshots characters with a Humanoid and HumanoidRootPart. Characters without a world transform cannot be drawn; leaving players are removed on the next snapshot. Death/respawn is supported, including a generation ID that prevents blending between lives.
2. Snapshots contain root CFrames, local box offsets/sizes, health, names, team, and optional part-center skeleton positions. They do not depend on characters being streamed to the viewer.
3. Store keeps up to eight samples per entity. It interpolates position, rotation, and skeleton points on the shared server clock, rejects older packets, expires stale data, and stops at the newest pose instead of extrapolating.
4. Projection transforms all eight oriented box corners using CurrentCamera:WorldToViewportPoint. GUI coordinates use IgnoreGuiInset. Offscreen boxes are culled; boxes crossing the camera near plane are deliberately hidden to avoid inverted rectangles.
5. Renderer reuses per-player GUI objects, sorts candidates by distance, and limits full rendering to the nearest configured budget. Radar is independent of on-screen box visibility.

## Performance and configuration

Defaults: 10 snapshots/second, 30 rendering updates/second, at most 32 fully rendered characters, 1,500-stud maximum distance, 300-stud radar range, and a 150 ms interpolation delay. All connected characters are streamed by default (`MaxTrackedPlayers = 0`). An optional server cap is available; it limits server enumeration order, not nearest-player selection.

Skeletons are off in the menu by default. To remove their network cost entirely, set `StreamSkeleton = false`; the menu cannot restore data the server does not send. R6/R15 skeletons join limb centers, not animated Motor6D joint pivots.

Pooling avoids creating GUI objects every frame. Network and rendering rates are independent. Snapshot bandwidth grows with players × authorized viewers × update rate; reduce rates, disable skeleton streaming, or introduce server interest management for large experiences. FPS and bandwidth have not been benchmarked in Roblox Studio, so negligible impact is not guaranteed.

## Extend the system

Modules separate transport (`server/Tracking`), pose state (`Store`), world-to-screen math (`Projection`), drawing (`Renderer`/`UI`), skeletons (`Skeleton`), radar (`Radar`), and settings (`Menu`). To add a per-player feature, register its factory before the first renderer update:

```lua
renderer:RegisterFeature("MyFeature", function(parent)
    return MyFeature.new(parent)
end)
```

The returned object implements `Update(entity, camera, settings)`, `Hide()`, and `Destroy()`. Skeleton is the working example. Add corresponding defaults/menu controls as needed. Registering after rendering begins is intentionally rejected.

## Validation

All 11 Luau source modules were compiled with the official Luau compiler. `test-store.luau` passed checks for pose/skeleton interpolation, out-of-order rejection, endpoint clamping, stale expiry, respawn reset, removal, and bounded history. Run with `luau test-store.luau`. Projection checks also passed for synthetic camera bounds, viewport clipping, offscreen culling, near-plane rejection, and behind-camera points; run `python test-projection.py /path/to/luau`. These fixtures do not reproduce the full Roblox camera engine. Build the XML demo and ZIP with `python build_demo.py`.

The generated XML was parsed and checked to contain all 11 script sources. This is structural validation; Studio rendering, service startup, multi-client replication, and performance remain untested here.

In Studio, test two clients, walking/turning, health changes, team changes, respawning, leaving, R6/R15 rigs, first/third-person cameras, screen edges, radar headings, menu toggles, streaming enabled, and network delay simulation. Test production authorization with an allowed and denied account. Use MicroProfiler and network statistics before raising player/rate budgets.
