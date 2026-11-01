# Blue Menu — ESP and Aimbot desktop workspace

A dedicated two-tab Windows app retaining the black/blue branding, rounded panels, authorized Player Data API, and configurable Roblox profiles. The only main tabs are **ESP** and **Aimbot**. No capture preview, local object detector, fake player sample, or injected game access is used.

## First-time setup

Follow [the Render and published Roblox setup guide](../relay/README.md). The relay is configured for Universe ID `10353139110`; the desktop profile defaults to Place ID `79862723087324`. Verify their relationship in Creator Hub. Deploy the relay, configure the server-side Creator Hub secret/HTTP settings, and publish the game integration before expecting live data.

In the desktop sidebar, expand **Profile & secure pairing**, enter the HTTPS relay and private pairing code shown in your authorized game client, then click **Pair game**. This is a one-time authorization step, not a per-module setup. Pairing credentials are encrypted by the native main process using Windows OS-backed Electron safeStorage, never localStorage. Profile/feature preferences remain local and existing preference keys are migrated where relevant.

## LAUNCH and STOP

**LAUNCH** arms one native SessionController. It waits for the Roblox process, restores the saved paired credential, polls the authorized API, validates the response, identifies the Place ID, loads the matched profile, and starts visualization/radar. If Roblox opens later, it starts automatically while armed. Game exit aborts polling and clears the current view; reopening starts it again. A different supported Place ID/job unloads the previous profile before loading the next. Unsupported places, unavailable process detection, invalid API responses, missing pairing, and network failures have explicit statuses.

**STOP** disarms auto-start, aborts the in-flight API request, cancels polling and animation frames, clears player/target/map state, and returns the interface to idle. Late results cannot re-enable it. The saved pairing is retained for the next LAUNCH. Use **Forget pairing** to revoke/delete authorization instead. Passive process monitoring remains active so the app can report launch/exit status; it does not start an integration after manual STOP.

Electron's single-instance lock prevents duplicate app processes; the controller additionally prevents duplicate integration/poll loops. Closing the app stops the controller and process monitor. No gameplay input, memory reading, anti-cheat bypass, or third-party game integration is implemented.

## ESP

All positions/names/health/team/skeleton data come from the paired server feed. Camera projection is supplied by the authorized viewing client. Controls include visualization enable/disable, boxes, names, health bars, distance, team IDs, skeleton, radar enable/range, camera-relative radar or world X/Z map, and color. The map plots actual horizontal player positions; it does not invent terrain. Skeleton availability depends on the game publisher's StreamSkeleton setting. Connected count includes loading players even when they have no drawable character yet.

Nothing is drawn while idle, unsupported, disconnected, or stale. Canvases are updated at up to 30 Hz from the latest HTTP snapshot, with no FPS or latency guarantee; the publisher defaults to 2 Hz. Labels and geometry use the actual game camera's viewport/FOV. Near-plane-crossing boxes are deliberately hidden. UI rendering is not a transparent overlay over the game window.

## Aimbot tab: authorized target selection

This tab provides an **enable/disable target selector and visual marker**, not automatic mouse movement or firing. Priority can be closest to crosshair, closest in world, or lowest health ratio. It supports center/head selection (head falls back to root if absent), same-team exclusion, crosshair/circle visibility, circle diameter in camera pixels, and maximum world distance. Dead, offscreen, behind-camera, same-team (when configured), and out-of-range candidates are rejected. A disabled selector produces no selected target. Only validated, profile-matched server data is considered.

## Development

Node.js 22+:

```sh
cd desktop
npm ci
npm test
npm start
npm run build -- --win --x64
```

Portable output: `dist/Blue Menu 1.0.0.exe`. It is unsigned. The package retains only Electron/build tools; TensorFlow, COCO-SSD, ONNX Runtime, model assets, capture IPC, window overlay tracking, old previews, and legacy renderer files were removed after eliminating their runtime references. The original uploaded model remains available in Git history; no inference model is needed by this version.

Modules: `main`/`preload` enforce native IPC boundaries, `session-controller` owns lifecycle, `game-process` detects only the Windows RobloxPlayerBeta process name, `game-profiles` owns profile settings, `player-api` handles encrypted authorization/polling, `player-data` validates/projects real records, `target-selection` selects eligible markers, `visualization` owns canvases/animation cleanup, and `ui` binds controls.

## Tests and limits

- `npm test`: actual API polling cancellation/late-response rejection and session lifecycle (LAUNCH/STOP, duplication, exit/reopen, switching, unsupported game, API recovery, canceled initialization, late packets, pairing prerequisite) and target selection/filtering.
- `node ../relay/server.test.js`: authenticated relay protocol, pairing, viewer isolation, stale/replayed data, revocation, reconnection, expiration, and projection.
- `python ui-workflow.test.py`: run a local static server first (`python -m http.server 8765 --bind 127.0.0.1` in desktop). Requires Python Playwright and Chromium at `/usr/bin/chromium`. This test exercises UI buttons against the actual backend SessionController with explicitly labeled API/process fixtures; it checks visualization/radar/target enablement, recovery, game transitions, STOP, late packets, and responsive widths. It is a development test, not packaged production code.

These tests passed in Linux. Native Windows process detection, OS credential storage, app startup, real Render deployment, published Roblox HTTP/camera data, and gameplay accuracy/performance still require live verification. No fixture data is present in production modules and no live connection is claimed before deployment and pairing.
