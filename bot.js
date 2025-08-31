const { Client, GatewayIntentBits } = require('discord.js');
const robot = require('robotjs');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const sharp = require("sharp");


const TOKEN = "MTQwMTUwNDk5ODcwMDg3NTkwOA.GH3_ig.6iWp8BZcbcivcFLtrHgGxf8GJRtxfFj8HyBWxQ";
const configFile = path.join(__dirname, 'accounts.json');

// Kích thước bảng account (5 hàng x 4 cột)
const ROWS = 3;
const COLS = 2;
const MAX_ACCOUNTS = ROWS * COLS;

// Load accounts.json
let accounts = {};
if (fs.existsSync(configFile)) {
    const data = JSON.parse(fs.readFileSync(configFile));
    accounts = data.accounts || {};
    console.log("📂 Loaded accounts.json:", accounts);
}

// Convert A1 → index
function getIndex(label) {
    const row = label[0].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
    const col = parseInt(label[1]) - 1;
    return row * COLS + col;
}

// Reset con trỏ lên đầu danh sách
async function resetCursor() {
    console.log("Max account: ", MAX_ACCOUNTS)
    for (let i = 0; i < MAX_ACCOUNTS; i++) {
        console.log("move up: ", i);
        robot.keyTap("up");
        await new Promise((r) => setTimeout(r, 30));
    }
}

// Chọn account bằng label (A1..E4)
async function selectAccount(label) {
    const index = getIndex(label);
    console.log("index: ", index);
    await resetCursor();

    for (let i = 0; i < index; i++) {
        robot.keyTap("down");
        await new Promise((r) => setTimeout(r, 30));
    }
}

// Chụp màn hình account theo tọa độ
async function captureAccount(label) {
    const coord = accounts[label];
    if (!coord) throw new Error("❌ Không tìm thấy tọa độ cho " + label);

    // Chụp toàn màn hình
    const img = await screenshot({ format: "png" });

    // Crop theo tọa độ account
    const outPath = path.join(__dirname, `${label}.png`);
    await sharp(img)
        .extract({ left: coord.x, top: coord.y, width: coord.w, height: coord.h })
        .toFile(outPath);

    return outPath;
}

// =============== DISCORD BOT ===============
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(" ");
    const cmd = args[0];

    try {
        if (message.content.startsWith("!type ")) {
            const text = message.content.replace("!type ", "");

            // Gõ text ra ngoài màn hình thật
            robot.typeString(text);
            robot.keyTap("enter")

            await message.reply(`✅ Đã gõ: "${text}"`);
        }

        if (cmd === "!start" && args[1]) {
            const label = args[1].toUpperCase();
            await selectAccount(label);
            // Tick/untick
            robot.keyTap("space");
            await message.reply(`Đã start account ${label}`);
        }

        if (cmd === "!stop" && args[1]) {
            const label = args[1].toUpperCase();
            console.log(label);
            await selectAccount(label);
            // Tick/untick
            robot.keyTap("space");
            await message.reply(`Đã stop account ${label}`);
        }

        if (cmd === "!screenshot" && args[1]) {
            const label = args[1].toUpperCase();
            const filePath = await captureAccount(label);
            await message.reply({
                content: `📸 Ảnh chụp màn hình của ${label}`,
                files: [filePath],
            });
        }
    } catch (err) {
        console.error(err);
        await message.reply("⚠️ Có lỗi xảy ra: " + err.message);
    }
});

client.login(TOKEN);