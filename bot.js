const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { keyboard, Key, mouse, screen } = require("@nut-tree-fork/nut-js");
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const { windowManager } = require('node-window-manager');

// ==========================================================
// 1. CẤU HÌNH HEADLESS & CHẶN CỬA SỔ
// ==========================================================

// Kiểm tra quyền thực thi (phòng hờ chạy nhầm file)
const isBot = process.env.IS_BOT === 'true' || process.argv.includes('--is-bot');
if (!isBot) {
    process.exit(0);
}

// Chặn tuyệt đối việc đóng app khi không có cửa sổ (giữ bot chạy ngầm)
app.on('window-all-closed', (e) => {
    e.preventDefault();
});

// Cấu hình nut-js: Độ trễ giữa các phím để game kịp nhận diện
keyboard.config.autoDelayMs = 50;

// ==========================================================
// 2. TẢI CẤU HÌNH (CONFIG)
// ==========================================================
const configPath = path.join(app.getPath('userData'), 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ Không tìm thấy file config.json');
    process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath));
const { token, targetTitle, rows, cols, accounts } = cfg;
const MAX = rows * cols;

// ==========================================================
// 3. CÁC HÀM ĐIỀU KHIỂN (HELPER FUNCTIONS)
// ==========================================================

function focusTarget() {
    try {
        windowManager.requestAccessibility();
        const win = windowManager.getWindows().find(w => w.getTitle().includes(targetTitle));
        if (!win) {
            console.log(`⚠️ Không tìm thấy cửa sổ: ${targetTitle}`);
            return false;
        }
        win.bringToTop();
        return true;
    } catch (e) {
        return false;
    }
}

async function resetCursor() {
    for (let i = 0; i < MAX; i++) {
        await keyboard.pressKey(Key.Up);
        await keyboard.releaseKey(Key.Up);
        await new Promise(r => setTimeout(r, 20));
    }
}

async function selectAccount(label) {
    const row = label.charCodeAt(0) - 65;
    const col = Number(label[1]) - 1;
    const targetIdx = row * cols + col;

    await resetCursor();
    for (let i = 0; i < targetIdx; i++) {
        await keyboard.pressKey(Key.Down);
        await keyboard.releaseKey(Key.Down);
        await new Promise(r => setTimeout(r, 20));
    }
}

async function captureAccount(label) {
    const acc = accounts[label];
    const rawPath = path.join(__dirname, `raw_${label}.png`);
    const outPath = path.join(__dirname, `crop_${label}.png`);

    await screenshot({ filename: rawPath });
    await sharp(rawPath)
        .extract({ left: acc.x, top: acc.y, width: acc.w, height: acc.h })
        .toFile(outPath);

    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    return outPath;
}

// ==========================================================
// 4. KẾT NỐI DISCORD & XỬ LÝ LỆNH
// ==========================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;

    const args = msg.content.trim().split(' ');
    const cmd = args[0].toLowerCase();
    const label = args[1]?.toUpperCase();

    try {
        // Kiểm tra xem lệnh có cần focus game không
        if (['!start', '!stop', '!type', '!screenshot'].includes(cmd)) {
            if (!focusTarget()) {
                return msg.reply(`❌ Lỗi: Không tìm thấy cửa sổ game "${targetTitle}"`);
            }
        }

        if (cmd === '!start' && label) {
            await selectAccount(label);
            await keyboard.type(Key.Space);
            await msg.reply(`✅ Đã nhấn START cho ${label}`);
        }

        else if (cmd === '!stop' && label) {
            await selectAccount(label);
            await keyboard.type(Key.Space);
            await msg.reply(`🛑 Đã nhấn STOP cho ${label}`);
        }

        else if (cmd === '!type') {
            const text = msg.content.replace('!type ', '').trim();
            await keyboard.type(text);
            await keyboard.pressKey(Key.Enter);
            await keyboard.releaseKey(Key.Enter);
            await msg.reply(`⌨️ Đã gõ: ${text}`);
        }

        else if (cmd === '!screenshot' && label) {
            if (!accounts[label]) return msg.reply(`❌ Account ${label} chưa có tọa độ trong config.`);
            const filePath = await captureAccount(label);
            await msg.reply({ content: `📸 Screenshot ${label}`, files: [filePath] });
        }
    } catch (err) {
        console.error("Lỗi thực thi lệnh:", err);
        msg.reply("⚠️ Có lỗi xảy ra khi thực hiện lệnh phím.");
    }
});

app.whenReady().then(() => {
    client.login(token).catch(err => {
        console.error("❌ Lỗi đăng nhập Discord:", err.message);
    });
});