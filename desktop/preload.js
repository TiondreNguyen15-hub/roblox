const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('system',{
 launch:profiles=>ipcRenderer.invoke('system:launch',profiles),stop:()=>ipcRenderer.invoke('system:stop'),configure:profiles=>ipcRenderer.invoke('system:configure',profiles),
 onEvent:callback=>ipcRenderer.on('system:event',(_event,event)=>callback(event))
});
contextBridge.exposeInMainWorld('gameProcess',{onStatus:callback=>ipcRenderer.on('game-process:status',(_event,status)=>callback(status))});

contextBridge.exposeInMainWorld('luaScripts',{confirmDiscard:()=>ipcRenderer.invoke('lua:confirmDiscard'),list:()=>ipcRenderer.invoke('lua:list'),select:id=>ipcRenderer.invoke('lua:select',id),load:()=>ipcRenderer.invoke('lua:load'),save:record=>ipcRenderer.invoke('lua:save',record),run:record=>ipcRenderer.invoke('lua:run',record),stop:()=>ipcRenderer.invoke('lua:stop'),onEvent:callback=>ipcRenderer.on('lua:event',(_event,event)=>callback(event))});
