const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('capture', {
  listWindows: () => ipcRenderer.invoke('capture:list-windows')
});
