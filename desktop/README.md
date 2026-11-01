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

## Visible-person detection

Start Capture beside ESP or Aim, choose an application, then press Connect Detection below Settings on the dashboard. The app loads the COCO-SSD lite MobileNet model from `https://storage.googleapis.com` and runs TensorFlow.js inference locally on the captured video. Internet access is needed to load the model; browser caching is not guaranteed. Video is not uploaded for inference. Disconnect Detection, Stop Capture, or return to the main menu to clear the boxes and stop detection.

Blue boxes appear in the app's capture preview for visible objects classified as people with confidence of at least 55%. ESP's Boxes and Names controls apply to those detections; labels show a generic Person and confidence, not usernames. Actual distance is unavailable. The model is trained on everyday images and can miss or misclassify stylized game characters. It cannot identify hidden players. Aim remains a visual preview and does not move the mouse or control games.

Validation: the packaged TensorFlow runtime executed tensor operations. Controlled browser tests verified person filtering, canvas box rendering, ESP toggles, disconnect/clear, model-load failures, cancellation, and capture cleanup using simulated predictions. The cloud policy returned HTTP 403 for the model endpoint, so real-model accuracy and Windows capture still require testing on the target PC. The app displays a load error and permits retry if model loading fails.

## Organized workspace and internet status

Play opens a workspace with a sidebar for Overview, ESP, Aim, and Settings. ESP and Aim have separate configuration cards; the application preview has its own capture panel. The AI Connection card sits below Settings and remains available while configuring tools. Main Menu stops capture and detection.

The connection card shows the browser's online/offline network indication, which does not guarantee the model host is reachable. Connect Detection checks for an active capture and an online network before downloading the official model. Download failures remain visible and the same button allows retry. The model connection is for visible-person inference; this app does not include an external chat AI provider, web search, or AI-to-AI messaging.

UI code is separated into `index.html`, `styles.css`, and `renderer.js`. Navigation, active sidebar state, simulated detection, capture cleanup, offline feedback, and layouts at 360, 700, and 1000 pixels were checked in Chromium. Native Windows capture and real-model detection still require testing on the target PC.
