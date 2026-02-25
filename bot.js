const { app } = require('electron');
const fs = require('fs').promises;
const fsSync = require('fs');
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
const configPath = path.join(__dirname, 'config.json');
if (!fsSync.existsSync(configPath)) {
    console.error('❌ Không tìm thấy file config.json');
    process.exit(1);
}

const cfg = JSON.parse(fsSync.readFileSync(configPath));
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

async function silentUnlink(filePath, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await fs.unlink(filePath);
            console.log(`[System] 🗑️ Đã xóa file tạm thành công: ${path.basename(filePath)}`);
            return;
        } catch (err) {
            if (err.code === 'EPERM' || err.code === 'EBUSY') {
                await new Promise(r => setTimeout(r, delay));
            } else if (err.code === 'ENOENT') {
                return;
            } else {
                throw err;
            }
        }
    }
    console.warn(`[System] ⚠️ Không thể xóa file sau ${retries} lần thử: ${filePath}`);
}

async function captureAccount(label) {
    const accConfig = accounts[label];
    if (!accConfig || !accConfig.windowName) {
        throw new Error(`Account ${label} chưa có tên cửa sổ trong config.`);
    }

    const allWindows = windowManager.getWindows();
    const targetWin = allWindows.find(w =>
        w.getTitle().toLowerCase().includes(accConfig.windowName.toLowerCase())
    );

    if (!targetWin) {
        throw new Error(`Không tìm thấy cửa sổ: ${accConfig.windowName}`);
    }

    // 1. Mang cửa sổ lên trước
    targetWin.bringToTop();
    await new Promise(r => setTimeout(r, 800));

    // 2. Lấy tọa độ Logic từ OS
    const bounds = targetWin.getBounds();

    const tempDir = app.getPath('temp');
    const fullWinPath = path.join(tempDir, `full_win_${label}.png`);
    const outPath = path.join(tempDir, `right_half_${label}.png`);

    // 3. Chụp toàn màn hình → Buffer (KHÔNG ghi file)
    const imgBuffer = await screenshot({ format: 'png' });

    // 4. Metadata
    const metadata = await sharp(imgBuffer).metadata();
    const imgW = metadata.width;
    const imgH = metadata.height;

    // 5. Scale factor
    const { screen } = require("@nut-tree-fork/nut-js");
    const screenWidthLogic = await screen.width();
    const screenHeightLogic = await screen.height();

    const scaleFactorX = imgW / screenWidthLogic;
    const scaleFactorY = imgH / screenHeightLogic;

    // 6. Bounds → pixel thật
    const realX = Math.round(bounds.x * scaleFactorX);
    const realY = Math.round(bounds.y * scaleFactorY);
    const realW = Math.round(bounds.width * scaleFactorX);
    const realH = Math.round(bounds.height * scaleFactorY);

    // 7. Crop nửa phải
    let left = Math.round(realX + realW / 2);
    let top = realY;
    let width = Math.round(realW / 2);
    let height = realH;

    // 8. Clamp biên
    left = Math.max(0, Math.min(left, imgW - 10));
    top = Math.max(0, Math.min(top, imgH - 10));
    if (left + width > imgW) width = imgW - left;
    if (top + height > imgH) height = imgH - top;

    // 9. Xuất ảnh kết quả
    await sharp(imgBuffer)
        .extract({ left, top, width, height })
        .toFile(outPath);

    return outPath;
}

async function captureAdmin() {
    const targetWin = windowManager.getWindows().find(w => w.getTitle().includes(targetTitle));
    if (!targetWin) throw new Error("Không tìm thấy cửa sổ Admin");

    targetWin.bringToTop();
    await new Promise(r => setTimeout(r, 800));

    const bounds = targetWin.getBounds();
    const tempDir = app.getPath('temp');
    const fullAdminPath = path.join(tempDir, `full_admin.png`);
    const outPath = path.join(tempDir, `entire_admin.png`);

    await screenshot({ filename: fullAdminPath });

    const metadata = await sharp(fullAdminPath).metadata();
    const imgW = metadata.width;
    const imgH = metadata.height;

    const { screen } = require("@nut-tree-fork/nut-js");
    const screenWidthLogic = await screen.width();
    const screenHeightLogic = await screen.height();

    const safeScreenWidth = screenWidthLogic || (imgW / 2);
    const safeScreenHeight = screenHeightLogic || (imgH / 2);

    const scaleFactorX = imgW / safeScreenWidth;
    const scaleFactorY = imgH / safeScreenHeight;

    const left = Math.round(bounds.x * scaleFactorX);
    const top = Math.round(bounds.y * scaleFactorY);
    const width = Math.round(bounds.width * scaleFactorX);
    const height = Math.round(bounds.height * scaleFactorY);

    const finalLeft = Math.max(0, Math.min(left, imgW - 10));
    const finalTop = Math.max(0, Math.min(top, imgH - 10));
    const finalWidth = Math.min(width, imgW - finalLeft);
    const finalHeight = Math.min(height, imgH - finalTop);

    console.log(`[Admin] 📸 Chụp toàn bộ cửa sổ: L:${finalLeft}, T:${finalTop}, W:${finalWidth}, H:${finalHeight}`);

    try {
        await sharp(fullAdminPath)
            .extract({
                left: finalLeft,
                top: finalTop,
                width: finalWidth,
                height: finalHeight
            })
            .toFile(outPath);
        console.log(`[Admin] ✅ Chụp toàn bộ cửa sổ thành công!`);
    } catch (err) {
        console.error(`[Admin] ❌ Sharp Error:`, err.message);
        throw err;
    }

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
            if (!accounts[label]) return msg.reply(`❌ Account ${label} chưa có cấu hình.`);

            const filePath = await captureAccount(label);

            await msg.reply({
                content: `📸 Screenshot ${label}`,
                files: [filePath]
            });
        }

        else if (cmd === '!tool') {
            if (!focusTarget()) return msg.reply(`❌ Lỗi: Không tìm thấy cửa sổ game "${targetTitle}"`);

            const filePath = await captureAdmin();

            await msg.reply({
                content: `📸 Screenshot Admin`,
                files: [filePath]
            });
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