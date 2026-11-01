const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const ScriptService=require('./script-service');
const path=require('node:path');
const LocalBackend=require('./local-backend');
const GameProcess=require('./game-process');
const Controller=require('./session-controller');
const api=new LocalBackend(),monitor=new GameProcess();
let window=null;
let scripts=null;
const session=new Controller({api,send:event=>{if(window&&!window.isDestroyed())window.webContents.send('system:event',event);}});
const trusted=event=>window&&!window.isDestroyed()&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame;
function check(event){if(!trusted(event))throw Error('Unavailable');}
function open(){
 window=new BrowserWindow({width:1200,height:820,minWidth:420,minHeight:600,title:'Blue Menu',backgroundColor:'#080d15',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',event=>event.preventDefault());
 window.webContents.once('did-finish-load',()=>monitor.start(status=>{if(window&&!window.isDestroyed())window.webContents.send('game-process:status',status);session.process(status);}));
 window.on('closed',()=>{session.stop();scripts?.stop();monitor.stop();window=null;});
 window.loadFile('index.html');
}
if(app.requestSingleInstanceLock()){
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(()=>{
  scripts=new ScriptService({root:path.join(app.getPath('userData'),'lua-scripts'),runner:app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked','lua-runner.js'):path.join(__dirname,'lua-runner.js'),dialog,owner:()=>window,send:event=>{if(window&&!window.isDestroyed())window.webContents.send('lua:event',event);}});
  for(const method of ['list','select','load','save','run','stop','confirmDiscard'])ipcMain.handle('lua:'+method,(event,arg)=>{check(event);return scripts[method](arg);});
  ipcMain.handle('system:launch',async(event,profiles)=>{check(event);await session.launch(profiles);return true;});
  ipcMain.handle('system:stop',event=>{check(event);session.stop();scripts.stop();return true;});
  ipcMain.handle('system:configure',(event,profiles)=>{check(event);session.configure(profiles);return true;});
  open();app.on('activate',()=>{if(!window)open();});
 });
}else app.quit();
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
