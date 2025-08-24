const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const {spawn} = require('child_process');
const fs = require('fs');

let win;
let botProcess = null;

function createWindow() {
    win = new BrowserWindow({
        width: 840,
        height: 700,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.loadFile('index.html');

    win.on('closed', () => {
        if (botProcess) {
            botProcess.kill('SIGTERM');
            botProcess = null;
        }
    });
}

app.whenReady().then(createWindow);

app.on('before-quit', () => {
    if (botProcess) {
        botProcess.kill('SIGTERM');
        botProcess = null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- IPC ----
ipcMain.handle('save-config', async (_evt, payload) => {
    // payload: { accounts: { AccountName: {x,y,w,h}, ... } }
    fs.writeFileSync(path.join(__dirname, 'accounts.json'), JSON.stringify({
        accounts: payload.accounts || {}
    }, null, 2));
    return {ok: true};
});

ipcMain.handle('start-bot', async (_evt) => {
    if (botProcess) return {ok: false, message: 'Bot is already running'};

    botProcess = spawn(process.execPath, [path.join(__dirname, 'bot.js')]);

    botProcess.stdout.on('data', d => win.webContents.send('bot-log', d.toString()));
    botProcess.stderr.on('data', d => win.webContents.send('bot-log', `ERR: ${d.toString()}`));
    botProcess.on('close', code => {
        win.webContents.send('bot-log', `Bot exited with code ${code}`);
        botProcess = null;
    });

    return {ok: true};
});

ipcMain.handle('stop-bot', async () => {
    if (!botProcess) return {ok: false, message: 'Bot is not running'};
    botProcess.kill();
    botProcess = null;
    return {ok: true};
});