# Blue Menu — local backend edition

A two-tab ESP/Aimbot Windows interface with black/blue styling, game profiles, LAUNCH/STOP lifecycle control, and a private local backend. The desktop no longer has HTTPS relay URLs, pairing codes, Pair/Forget buttons, credential restoration, remote HTTP polling, or remote-server configuration screens.

## Important Roblox limitation

The normal published Roblox desktop client does **not** provide a supported local player-data API to another application. Live Roblox game servers also cannot send HTTP directly to a player's localhost. Removing the relay does not create local access to private players, camera data, health, or team information.

Accordingly, this build detects the Roblox process but reports **INTEGRATION REQUIRED**: an authorized external game-side integration is necessary to identify the current Place ID and obtain live player data. It does not claim a connected game, fabricate a Place ID match, draw fake players, scan Roblox memory/logs, inject code, or bypass anti-cheat. The configured Place ID `79862723087324` is a preference, not a detected game identity.

**Live Roblox ESP and target selection are unavailable in this local-only build.** The visualization and filtering modules remain functional for a future genuinely supported, authorized data adapter, and are regression-tested with explicitly labeled fixtures. No test adapter is bundled as a live integration.

## Local security and lifecycle

Renderer → sandboxed preload → Electron main IPC → LocalBackend → trusted bundled adapter.

No local HTTP/WebSocket server or TCP port is opened. The renderer has no Node access, context isolation and sandboxing remain enabled, and IPC accepts only the main window's top-level frame. The page's default-deny CSP does not allow network connections. No IPC method accepts arbitrary player packets from other processes. Only deliberately bundled native adapters may emit data to the controller.

LAUNCH initializes one local backend, waits for the Windows Roblox process, checks the adapter's capabilities, and starts ESP/radar only if a supported authorized adapter supplies validated data for a configured profile. The current Roblox adapter emits only the explicit external-integration requirement. It never emits player data.

STOP disarms auto-start, aborts local initialization, disposes active adapter resources, cancels animation frames, releases canvas buffers, clears target/player state, and returns to idle. Generation guards reject late callbacks. The passive process monitor remains available to report Roblox launch/exit without reopening a stopped session. Game exit unloads active integration state; if armed, reopening checks capabilities again. Single-instance locking and controller guards prevent duplicate integrations.

## Controls

- **ESP / Aimbot**: existing feature controls and saved preferences are preserved. Aimbot remains an authorized target selector/marker, not mouse movement or firing.
- **LAUNCH / STOP**: actual native backend control, including when no supported data integration exists.
- **Game profile & preferences**: configure Place ID/name, save profile settings, and reduce motion. No remote connection setup is present.
- The radar/map and canvases stay empty when no authorized feed is available. Names, health, skeletons, distance, teams, and target results are never invented.

## Existing external source

The repository's `relay`, Render configuration, and game-side HTTP bridge are preserved as optional/reference source so working code is not destroyed. They are **not invoked, configured, connected, or packaged by this desktop build**. The previous desktop remote client and pairing IPC are removed. An old encrypted `player-api.enc` file from earlier versions is not read or used; previous remote tokens are not revoked over the network by this local-only app. The old relay's tokens expire according to its existing policy.

Supporting published Roblox through that external architecture again would require a deliberate authorized integration and appropriate secure setup; this version does not secretly reconnect to it. Roblox's in-game `game-tracker` visualization can still be installed in your own experience independently of this desktop app.

## Development and modular adapters

```sh
cd desktop
npm ci
npm test
npm start
npm run build -- --win --x64
```

The portable unsigned Windows output is `dist/Blue Menu 1.0.0.exe`. Only Electron and its builder remain as dependencies; removing the remote client required no new package. Existing encrypted credentials are not loaded. No model/capture dependency is reintroduced.

`LocalBackend` wraps a **trusted bundled** adapter implementing `start({signal, profiles, emit})`. It returns a cleanup function (or promise of one). Adapters must honor cancellation and emit either a truthful capability/status event or real authorized packets conforming to `player-data.js`. This is a code-level extension contract, not an open network ingestion API or arbitrary plugin loader. `SessionController` still validates data and game profiles before permitting rendering. Asynchronous initialization that finishes after STOP has its cleanup called immediately.

## Verification

- `npm test`: lifecycle/profile matching, target filtering, actual local-backend capability reporting, no fabricated packets, cancellation, cleanup, late data rejection, STOP/relaunch.
- `python local-ui.test.py`: UI → actual SessionController → actual built-in LocalBackend → UI. No player fixtures are injected. Verifies removed remote controls, LAUNCH/process wait, truthful integration requirement, empty ESP/Aimbot, STOP/disarm/relaunch, buffer release.
- `python ui-workflow.test.py`: retained visualization regression test through a separate explicit test adapter. Tests player rendering, target controls, switching, errors, and STOP with fixture packets; never described as live Roblox data.

Browser tests require a local static server at port 8765 (`python -m http.server 8765 --bind 127.0.0.1` in desktop), Python Playwright, and Chromium at `/usr/bin/chromium`. These test-only servers are not part of production architecture.

Tests passed on Linux. Native Windows startup/process querying and an actual Roblox client are not verified here. Published Roblox private data is intentionally unavailable through the default local adapter; this is a platform integration requirement, not a claim that an untested live connection exists.

## Detection troubleshooting

See [the source-level detection report](DETECTION-REPORT.md). The connection area now separates the configured target from process detection, observed game identity, authorized data connectivity, and ESP activity. LAUNCH reports bundled integration capabilities; no local Place ID/player-data connector is claimed.

Backend diagnostic codes now distinguish process-query failures, missing identity/data connectors, adapter startup exceptions, invalid data, and unsupported profiles. Repeated LAUNCH preserves the precise failure; stable automatic states are deduplicated. The default local backend is a running private IPC component, not a running Roblox API. See DETECTION-REPORT.md for the exact native call path and responsible files.
