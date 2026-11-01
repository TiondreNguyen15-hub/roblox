const { app, BrowserWindow, desktopCapturer, ipcMain, screen } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const PlayerApi=require('./player-api');
const playerApi=new PlayerApi();
const gameProcess=new (require('./game-process'))();
let mainWindow, overlayWindow, tracker, allowedSources=new Set();
function closeOverlay(){
  if(tracker){tracker.kill();tracker=null;}
  if(overlayWindow&&!overlayWindow.isDestroyed())overlayWindow.destroy();
  overlayWindow=null;
}
function trusted(event){return mainWindow&&!mainWindow.isDestroyed()&&event.sender===mainWindow.webContents&&event.senderFrame===mainWindow.webContents.mainFrame;}
function cleanFrame(frame){
  if(!frame||!Array.isArray(frame.boxes))return null;
  const unit=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
  return {boxes:frame.boxes.slice(0,50).filter(box=>Array.isArray(box.bbox)&&box.bbox.length===4&&box.bbox.every(unit)&&unit(box.score)),labels:!!frame.labels,circle:!!frame.circle,crosshair:!!frame.crosshair,radius:unit(frame.radius)?frame.radius:0,target:Array.isArray(frame.target)&&frame.target.length===2&&frame.target.every(unit)?frame.target:null};
}
function openWindow() {
  const window = new BrowserWindow({
    width: 1000, height: 740, minWidth: 360, minHeight: 540,
    title: 'Blue Menu', backgroundColor: '#080c14', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  mainWindow=window;
  window.on('closed',()=>{playerApi.stop();gameProcess.stop();closeOverlay();mainWindow=null;});
  window.webContents.once('did-finish-load',()=>gameProcess.start(status=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('game-process:status',status);}));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile('index.html');
}
app.whenReady().then(() => {
  const sendApi=event=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('player-api:event',event);};
  ipcMain.handle('player-api:restore',async event=>{if(!trusted(event))throw Error('Unavailable');const result=await playerApi.restore();if(result)playerApi.start(sendApi);return result;});
  ipcMain.handle('player-api:pair',async(event,url,code)=>{if(!trusted(event)||typeof url!=='string'||url.length>2048||typeof code!=='string'||code.length>32)throw Error('Invalid pairing');const result=await playerApi.pair(url,code);playerApi.start(sendApi);return result;});
  ipcMain.handle('player-api:forget',async event=>{if(!trusted(event))throw Error('Unavailable');await playerApi.forget();return true;});
  ipcMain.handle('capture:list-windows', async event => {
    if (!trusted(event)) throw new Error('Unavailable');
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } });
    const windows=sources.filter(source => !['Blue Menu','Blue Menu Overlay'].includes(source.name)).map(source => ({ id: source.id, name: source.name }));
    allowedSources=new Set(windows.map(source=>source.id));return windows;
  });
  ipcMain.handle('overlay:start',async(event,sourceId)=>{
    if(!trusted(event)||!allowedSources.has(sourceId))throw new Error('Select an available window first.');
    closeOverlay();
    if(process.platform!=='win32')return {ok:false,message:'Screen overlay requires Windows.'};
    const match=/^window:(\d+):/.exec(sourceId);
    if(!match)return {ok:false,message:'This capture source does not provide a window handle.'};
    const handle=BigInt(match[1]);if(handle<=0n||handle>9223372036854775807n)throw new Error('Invalid window handle.');
    const current=new BrowserWindow({width:1,height:1,show:false,transparent:true,frame:false,focusable:false,skipTaskbar:true,hasShadow:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    overlayWindow=current;current.setIgnoreMouseEvents(true,{forward:true});current.setAlwaysOnTop(true,'screen-saver');current.setContentProtection(true);
    await current.loadFile('overlay.html');
    if(current.isDestroyed())return {ok:false,message:'Overlay was closed.'};
    const script=app.isPackaged?path.join(process.resourcesPath,'track-window.ps1'):path.join(__dirname,'track-window.ps1');
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',script,'-WindowHandle',handle.toString()],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    tracker=child;let pending='';
    child.stdout.on('data',chunk=>{
      pending+=chunk.toString();if(pending.length>65536){pending='';return;}
      const lines=pending.split(/\r?\n/);pending=lines.pop();
      for(const line of lines){try{
        const rect=JSON.parse(line);if(current.isDestroyed())return;
        if(!rect.visible||rect.width<1||rect.height<1){current.hide();continue;}
        const bounds=screen.screenToDipRect(null,{x:rect.x,y:rect.y,width:rect.width,height:rect.height});
        current.setBounds(bounds);current.showInactive();
      }catch{}}
    });
    const failed=()=>{
      if(overlayWindow===current){closeOverlay();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('overlay:status','Overlay tracking stopped. Re-select the window; check Windows PowerShell script permissions if it persists.');}
    };
    child.on('error',failed);child.on('exit',failed);
    // Drain stderr without logging potentially sensitive window information.
    child.stderr.on('data',()=>{});
    return {ok:true,message:'Overlay tracks the selected window while it is in the foreground.'};
  });
  ipcMain.on('overlay:frame',(event,frame)=>{if(trusted(event)&&overlayWindow&&!overlayWindow.isDestroyed())overlayWindow.webContents.send('overlay:frame',cleanFrame(frame));});
  ipcMain.on('overlay:stop',event=>{if(trusted(event))closeOverlay();});
  openWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
