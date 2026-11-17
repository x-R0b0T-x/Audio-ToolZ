const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('audioToolzDesktop', {
  getRecentFiles: () => ipcRenderer.invoke('audio-toolz:recent-list'),
  clearRecentFiles: () => ipcRenderer.invoke('audio-toolz:recent-clear'),
  pickAudioFiles: () => ipcRenderer.invoke('audio-toolz:pick'),
  openRecent: (id) => ipcRenderer.invoke('audio-toolz:recent-open', id),
  confirmOpened: (token) => ipcRenderer.invoke('audio-toolz:confirm', token),
  rememberFile: (file) => {
    const filePath = webUtils.getPathForFile(file);
    return filePath ? ipcRenderer.invoke('audio-toolz:remember', filePath) : Promise.resolve();
  }
});
