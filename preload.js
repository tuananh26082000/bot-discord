const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    startBot: () => ipcRenderer.invoke('start-bot'),
    stopBot: () => ipcRenderer.invoke('stop-bot'),

    onLog: (callback) => {
        const handler = (_e, msg) => callback(msg);
        ipcRenderer.on('bot-log', handler);

        return () => {
            ipcRenderer.removeListener('bot-log', handler);
        };
    }
});