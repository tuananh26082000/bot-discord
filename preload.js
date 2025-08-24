const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
    saveConfig: (data) => ipcRenderer.invoke('save-config', data),
    startBot: (data) => ipcRenderer.invoke('start-bot', data),
    stopBot: () => ipcRenderer.invoke('stop-bot'),
    onLog: (cb) => ipcRenderer.on('bot-log', (_e, msg) => cb(msg))
});