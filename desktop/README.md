# Blue Menu — Windows desktop app

Black and blue desktop workspace with rounded panels, capture preview, ESP controls, and an Aim target marker.

## Run

Download `downloads/Blue-Menu-Windows.exe` from the repository and open it on Windows x64. The portable app is unsigned. Press Play, Start Capture, then select an application window. Detection starts automatically using the bundled uploaded ONNX model; no internet connection is needed.

ESP draws model detections in the capture preview and, when Screen Overlay is enabled, in a transparent click-through window over the selected application. The overlay follows the selected window while it is in the foreground and hides when the window is minimized or loses focus. Return to the captured application after configuring the menu to see the overlay. Stop Capture or return to Main Menu to stop detection, remove the overlay, and release the video stream. Disconnect Detection clears boxes and markers while leaving the preview available.

Aim marks the detection nearest the image center inside the configured circle. Target Marker, Crosshair, Show Circle, and Circle Size control the preview and screen overlay. This is a target marker, as requested; the app does not move the mouse or control gameplay. ESP Names shows the model class and confidence, not actual usernames. Distance is only a sample preview; the model does not output world distance. The model's Enemy class does not verify team membership.

## Overlay requirements

Windows PowerShell is used to query the selected window's visible bounds and foreground status. The bundled `track-window.ps1` must be allowed by the machine's script policy; the app does not bypass it. If tracking fails, a status message appears and capture preview remains available. The overlay uses DPI conversion and excludes itself from capture. Exclusive fullscreen applications and protected windows may not support desktop overlays; test in windowed or borderless mode. Windows alignment and multi-monitor behavior have not been verified in this Linux environment.

## Model

`models/roblox.onnx` is the user-uploaded model. See `models/README.md` for its original filename, SHA-256, tensor shapes, metadata, and declared AGPL-3.0 license. ONNX Runtime Web, its WASM binary, and the model are bundled locally. Video is processed locally and is not uploaded. Inputs use 640×640 RGB letterboxing; outputs use confidence filtering and non-maximum suppression.

## Develop

Use Node.js 22 or newer. From `desktop`:

```sh
npm ci
npm start
npm test
npm run build -- --win --x64
```

Output: `dist/Blue Menu 1.0.0.exe`. The model runtime and WASM assets are retained under `vendor`. The tracking script is copied into the packaged resources directory. English Electron locale resources are packaged to keep the portable download small.

## Verified

- ONNX structural validation and CPU inference on a blank frame: passed, finite output `[1,5,8400]`.
- Actual browser WASM inference with the uploaded model: passed; blank video produced zero detections.
- Three decoder checks: letterbox reversal/NMS, invalid and low-confidence filtering, and boundary clipping.
- Browser checks with controlled predictions: automatic capture-to-detection startup, nearest-target selection, target toggle, overlay lifecycle, normalized overlay rendering, and capture cleanup.
- Native Windows capture/tracking, fullscreen compatibility, DPI alignment, and gameplay accuracy still require testing on the target PC. Blank-frame inference verifies execution, not detection accuracy.

## Published-game API integration

The Settings tab now supports HTTPS relay pairing. The main process encrypts the saved viewer credential with OS-backed safeStorage; renderer scripts receive data but no token. ESP switches to Player Data visualization only for validated live responses and returns to its previous panel on failure. Aim and the capture fallback are retained pending published-game verification. See [the deployment guide](../relay/README.md). The Windows binary includes this adapter but has not been paired with a real published server here.

Game Profile settings now target Place `79862723087324`, independently of the relay Universe ID. The process monitor detects Roblox launches/exits; authenticated API data establishes the actual game name/Place ID. Profile settings auto-load only on a match. See the deployment guide for limitations and live verification.
