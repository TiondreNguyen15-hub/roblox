# Roblox detection investigation

## Findings

The current build detects a Windows process, not the Roblox experience inside that process. `game-process.js` executes `Get-Process -Name RobloxPlayerBeta` and reports a count. It does not ask Roblox for a Place ID or player records, inspect memory, read launch credentials/logs, or call a game API.

The default `LocalBackend` adapter is only a capability check: it emits a diagnostic that a supported local Roblox identity/player-data API is unavailable. It has no data-fetch implementation and never emits player snapshots. This is the immediate reason LAUNCH cannot identify a place or retrieve players. It is not a failed API request or an authorization token that needs retrying.

The configured Place ID `79862723087324` comes from `game-profiles.js` or the user's saved profile. It is a target for later matching. It was never a detected Place ID in the backend. The initial HTML label previously showed bare “Place 79862723087324,” which could imply detection. The UI now explicitly separates the configured target (not detected) from an independently reported current game.

## Implemented vs connected

| Component | Implementation | Current connection/capability |
| --- | --- | --- |
| Windows Roblox process monitor | Implemented and called on app load | Reports process presence only; native Windows execution is not verified in this Linux environment |
| Private Electron IPC/backend | Implemented and initialized by LAUNCH | Trusted main-frame IPC; does not confer Roblox data access |
| Default local Roblox adapter | Capability check implemented | No actual Place ID/player-data connector exists |
| Game identity/profile matcher | Implemented in SessionController | Identifies a game only from a valid trusted integration packet; settings never establish identity |
| ESP/radar/target visualization | Implemented and fixture-tested | Inactive unless a validated, profile-matched data packet arrives |
| In-game Roblox tracker | Source in game-tracker | Works inside your experience's game code; not a desktop transport; live execution not verified here |
| Game-side HTTP bridge | Optional source in game-tracker/server/HttpBridge.lua | ExportConfig.Enabled is false and RelayUrl is empty in this checkout |
| Relay service | Optional source in relay | Not started/connected by the desktop; deployment state is unknown |
| Desktop external HTTP consumer | Removed in the earlier local-only change | No remote data path currently exists; enabling only the game-side scripts will not connect this desktop |

## Status changes made

The existing connection area now has distinct labels for:

- Configured target Place ID — explicitly not detected.
- Roblox detected — only the process monitor can report yes/no.
- Game identified — only a valid authorized integration packet supplies this ID/name.
- Player data connected — only a validated supported feed establishes this.
- ESP active — only while an authorized feed is accepted and visualization is enabled.

A valid packet for an unsupported profile can identify the actual game, but does not enable player-data rendering for that profile. Invalid/stale data, capability failures, game exit, STOP, and disconnect clear data/ESP status. A stale canvas now changes the system badge to STALE instead of leaving a connected-looking status. LAUNCH reports the integration inventory and initializes the only bundled adapter; it does not claim to initialize an absent external connector.

## What requires developer authorization

For your own published experience, standard game code can report real `game.PlaceId`, `game.GameId`, `game.JobId`, player state, and permitted character data. Viewer camera data must come from an authorized LocalScript; the server cannot independently observe it. Access must be restricted to permitted viewer UserIds/roles in server code.

To connect that data to a separate desktop app, a supported authorized transport and matching desktop consumer are required. The previous optional architecture needs all of the following:

1. Permission to edit/publish the target experience and install the server/client modules.
2. A deployed public HTTPS endpoint reachable by live Roblox servers, HTTP requests enabled, a publisher credential in Creator Hub Secrets scoped to its hostname, and the matching Universe ID.
3. Server viewer authorization and the authorized camera-export script.
4. A securely authorized desktop data-consumer adapter, which is deliberately absent from the local-only app.
5. Publication/new game servers, then actual live testing of identity, data, freshness, and access controls.

A live Roblox server cannot directly publish to the player's localhost. Private Electron IPC cannot make the normal Roblox client export its private state. No supported local connector is implemented here, and this change does not restore the removed remote architecture or bypass Roblox security. Without an authorized transport/adapter, the correct outcome is process detected, game unidentified, player data disconnected, ESP inactive.

## Verification boundary

Backend lifecycle/target-selection/local capability tests and browser tests pass with explicit process/data test adapters. The local-backend UI test uses the actual built-in adapter and no player fixtures: it verifies that a running process plus configured Place ID never becomes game identified or ESP active. Native Windows process querying, any deployed relay, your published scripts, and real player data were not accessed or verified in this environment.
