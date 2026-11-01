const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('capture', {
  listWindows: () => ipcRenderer.invoke('capture:list-windows'),
  startOverlay: sourceId => ipcRenderer.invoke('overlay:start',sourceId),
  updateOverlay: frame => ipcRenderer.send('overlay:frame',frame),
  stopOverlay: () => ipcRenderer.send('overlay:stop'),
  onOverlayFrame: callback => ipcRenderer.on('overlay:frame',(_event,frame)=>callback(frame)),
  onOverlayStatus: callback => ipcRenderer.on('overlay:status',(_event,message)=>callback(message))
});
