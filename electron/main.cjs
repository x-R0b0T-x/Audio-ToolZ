const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

app.setName('Audio ToolZ');
// Les préférences restent dans le dossier extrait : ne pas utiliser Program Files.
app.setPath('userData', path.join(path.dirname(process.execPath), 'user-data'));

app.whenReady().then(() => {
  const entry = path.join(__dirname, 'dist', 'index.html');
  const isLocalApp = (url) => {
    try { return new URL(url).protocol === 'file:'; } catch { return false; }
  };
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(permission === 'media' && isLocalApp(contents.getURL()));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) =>
    permission === 'media' && Boolean(contents) && isLocalApp(contents.getURL())
  );
  const win = new BrowserWindow({
    width: 1360, height: 900, minWidth: 900, minHeight: 600,
    title: 'Audio ToolZ 1.3', icon: path.join(__dirname, 'dist', 'icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.loadFile(entry).catch((error) => { console.error(error); app.quit(); });
});
app.on('window-all-closed', () => app.quit());
