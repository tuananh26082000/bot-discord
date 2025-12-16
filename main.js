const isBot = process.env.IS_BOT === 'true' || process.argv.includes('--is-bot');
if (isBot) {
    require('./bot.js');
    return;
}

const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const getConfigPath = () => path.join(app.getPath('userData'), 'config.json');

let win, bot;

app.whenReady().then(()=>{
    win = new BrowserWindow({
        width: 900,
        height: 720,
        webPreferences:{
            preload: path.join(__dirname,'preload.js'),
            contextIsolation:true
        }
    });
    win.loadFile('index.html');
});

ipcMain.handle('save-config',(_,cfg)=>{
    try {
        const filePath = getConfigPath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2));
        console.log("💾 Đã ghi file thành công tại:", filePath);
        return { ok: true };
    } catch (error) {
        console.error("❌ Lỗi ghi file:", error);
        return { ok: false, error: error.message };
    }
});

ipcMain.handle('start-bot', () => {
    if (bot) return { ok: false };

    bot = spawn(process.execPath, [
        path.join(__dirname, 'bot.js'),
        '--is-bot'
    ], {
        env: {
            ...process.env,
            IS_BOT: 'true'
        }
    });

    bot.stdout.on('data', d => win.webContents.send('bot-log', d.toString()));
    bot.stderr.on('data', d => win.webContents.send('bot-log', 'ERR ' + d));
    bot.on('close', () => bot = null);

    return { ok: true };
});

ipcMain.handle('stop-bot',()=>{
    if (!bot) return {ok:false};
    bot.kill();
    bot=null;
    return {ok:true};
});