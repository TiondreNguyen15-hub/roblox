const { app, BrowserWindow } = require('electron');
function openWindow() {
  const window = new BrowserWindow({
    width: 1000, height: 740, minWidth: 360, minHeight: 540,
    title: 'Blue Menu', backgroundColor: '#080c14', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile('index.html');
}
app.whenReady().then(() => {
  openWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
