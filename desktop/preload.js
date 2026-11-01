const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('system',{
 launch:profiles=>ipcRenderer.invoke('system:launch',profiles),stop:()=>ipcRenderer.invoke('system:stop'),configure:profiles=>ipcRenderer.invoke('system:configure',profiles),
 onEvent:callback=>ipcRenderer.on('system:event',(_event,event)=>callback(event))
});
contextBridge.exposeInMainWorld('playerApi',{
 restore:()=>ipcRenderer.invoke('player-api:restore'),pair:(url,code)=>ipcRenderer.invoke('player-api:pair',url,code),forget:()=>ipcRenderer.invoke('player-api:forget')
});
contextBridge.exposeInMainWorld('gameProcess',{onStatus:callback=>ipcRenderer.on('game-process:status',(_event,status)=>callback(status))});
