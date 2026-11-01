const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('node:path');
function openWindow() {
  const window = new BrowserWindow({
    width: 1000, height: 740, minWidth: 360, minHeight: 540,
    title: 'Blue Menu', backgroundColor: '#080c14', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile('index.html');
}
app.whenReady().then(() => {
  ipcMain.handle('capture:list-windows', async event => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || event.senderFrame !== event.sender.mainFrame) throw new Error('Unavailable');
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } });
    return sources.filter(source => source.name !== window.getTitle()).map(source => ({ id: source.id, name: source.name }));
  });
  openWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
