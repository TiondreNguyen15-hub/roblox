const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gameProcess',{onStatus:callback=>ipcRenderer.on('game-process:status',(_event,status)=>callback(status))});
contextBridge.exposeInMainWorld('playerApi',{
 restore:()=>ipcRenderer.invoke('player-api:restore'),
 pair:(url,code)=>ipcRenderer.invoke('player-api:pair',url,code),
 forget:()=>ipcRenderer.invoke('player-api:forget'),
 onEvent:callback=>ipcRenderer.on('player-api:event',(_event,event)=>callback(event))
});
contextBridge.exposeInMainWorld('capture', {
  listWindows: () => ipcRenderer.invoke('capture:list-windows'),
  startOverlay: sourceId => ipcRenderer.invoke('overlay:start',sourceId),
  updateOverlay: frame => ipcRenderer.send('overlay:frame',frame),
  stopOverlay: () => ipcRenderer.send('overlay:stop'),
  onOverlayFrame: callback => ipcRenderer.on('overlay:frame',(_event,frame)=>callback(frame)),
  onOverlayStatus: callback => ipcRenderer.on('overlay:status',(_event,message)=>callback(message))
});
