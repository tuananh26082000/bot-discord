const isBot = process.env.IS_BOT === 'true' || process.argv.includes('--is-bot');
if (isBot) {
    require('./bot.js');
    return;
}

const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { windowManager } = require('node-window-manager');

const getConfigPath = () => path.join(app.getPath('userData'), 'config.json');

let win, bot;

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// ---- IPC HANDLERS ----
ipcMain.handle('save-config', (_, cfg) => {
    try {
        const filePath = getConfigPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2));
        console.log("💾 Đã lưu cấu hình tại:", filePath);
        return { ok: true };
    } catch (error) {
        console.error("❌ Lỗi ghi file:", error);
        return { ok: false, error: error.message };
    }
});

ipcMain.handle('get-windows', () => {
    try {
        return windowManager.getWindows()
            .map(w => w.getTitle())
            .filter(title => title && title.length > 0);
    } catch (e) {
        return [];
    }
});

ipcMain.handle('start-bot', () => {
    if (bot) return { ok: false, message: "Bot đang chạy" };

    const filePath = getConfigPath();
    if (!fs.existsSync(filePath)) {
        return { ok: false, message: "Vui lòng nhấn 'Save Config' trước khi bắt đầu!" };
    }
    bot = spawn(process.execPath, [
        path.join(__dirname, 'bot.js'),
        '--is-bot'
    ], {
        env: { ...process.env, IS_BOT: 'true' }
    });

    bot.stdout.on('data', d => win.webContents.send('bot-log', d.toString()));
    bot.stderr.on('data', d => win.webContents.send('bot-log', 'ERR: ' + d.toString()));

    bot.on('close', (code) => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('bot-log', `--- Bot đã dừng (Exit code: ${code}) ---`);
        }
        bot = null;
    });

    return { ok: true };
});

ipcMain.handle('stop-bot', () => {
    if (!bot) return { ok: false };
    bot.kill();
    bot = null;
    return { ok: true };
});