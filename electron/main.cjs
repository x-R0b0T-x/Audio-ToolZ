const { app, BrowserWindow, session, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createRecentStore } = require('./recent-store.cjs');
app.setName('Audio ToolZ');
app.commandLine.appendSwitch('lang', 'fr');
app.setPath('userData', path.join(path.dirname(process.execPath), 'user-data'));
const community = 'https://t.me/Audio_ToolZ';
const isCommunity = (url) => url === community || url === community + '/';
app.whenReady().then(() => {
  const entry = path.join(__dirname, 'dist', 'index.html');
  const entryURL = pathToFileURL(entry).href;
  const store = createRecentStore(path.join(app.getPath('userData'), 'recent-files.json'));
  const pending = new Map();
  const win = new BrowserWindow({
    width: 1360, height: 900, minWidth: 900, minHeight: 600,
    title: 'Audio ToolZ 1.4', icon: path.join(__dirname, 'dist', 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  const trusted = (event) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== entryURL) throw new Error('Requete non autorisee.');
  };
  const handle = (channel, fn) => ipcMain.handle(channel, async (event, ...args) => { trusted(event); return fn(...args); });
  const payload = async (filePath) => {
    const data = await fs.promises.readFile(filePath);
    const now = Date.now();
    for (const [token, value] of pending) if (now - value.time > 300000) pending.delete(token);
    while (pending.size >= 100) pending.delete(pending.keys().next().value);
    const token = crypto.randomUUID();
    pending.set(token, { path: filePath, time: now });
    return { token, name: path.basename(filePath), data: new Uint8Array(data) };
  };
  handle('audio-toolz:recent-list', () => store.list());
  handle('audio-toolz:recent-clear', () => { store.clear(); });
  handle('audio-toolz:remember', (filePath) => { store.remember(filePath); });
  handle('audio-toolz:confirm', (token) => {
    const value = pending.get(token);
    pending.delete(token);
    if (!value || Date.now() - value.time > 300000) throw new Error('Ouverture expiree.');
    store.remember(value.path);
  });
  handle('audio-toolz:recent-open', async (id) => {
    const filePath = typeof id === 'string' ? store.find(id) : null;
    if (!filePath) throw new Error('Fichier absent de la liste.');
    return payload(filePath);
  });
  handle('audio-toolz:pick', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Ouvrir un fichier audio', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'flac', 'ogg'] }]
    });
    if (result.canceled) return [];
    const resultFiles = [];
    for (const filePath of result.filePaths) resultFiles.push(await payload(filePath));
    return resultFiles;
  });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(permission === 'media' && contents === win.webContents && contents.getURL() === entryURL);
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => permission === 'media' && contents === win.webContents && contents.getURL() === entryURL);
  const openCommunity = (url) => { if (isCommunity(url)) void shell.openExternal(community).catch(console.error); };
  win.removeMenu();
  win.webContents.setWindowOpenHandler(({ url }) => { openCommunity(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { event.preventDefault(); openCommunity(url); });
  win.loadFile(entry).catch((error) => { console.error(error); app.quit(); });
});
app.on('window-all-closed', () => app.quit());
