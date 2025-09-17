@echo off
setlocal enabledelayedexpansion

:: ==== Check for Admin rights ====
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️ Please run install.bat as Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================
echo 🚀 Starting Discord Bot Controller installation
echo ================================================

:: ==== Check NVM ====
where nvm >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️ NVM is not installed. Please install NVM for Windows first:
    echo 👉 https://github.com/coreybutler/nvm-windows/releases
    pause
    exit /b
)

:: ==== Install Node.js v20.19.4 ====
echo 👉 Installing Node.js v20.19.4 via NVM...
nvm install 20.19.4
nvm use 20.19.4

:: ==== Install dependencies ====
echo 👉 Installing required npm packages...
call npm install discord.js electron jimp screenshot-desktop sharp

:: ==== Rebuild robotjs for Electron ====
echo 👉 Rebuilding robotjs for Electron...
call npm install robotjs --build-from-source --runtime=electron --target=31.7.7 --dist-url=https://electronjs.org/headers

echo ================================================
echo ✅ Installation completed successfully!
echo You can now run the bot using: run.bat
echo ================================================

pause