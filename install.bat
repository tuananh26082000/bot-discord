@echo off
:: =============================
:: Install Script for Project
:: =============================

:: Kiểm tra quyền admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Yêu cầu chạy file này bằng quyền Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =============================
echo 1. Cài đặt NVM for Windows (nếu chưa có)
echo =============================

:: Kiểm tra nvm
where nvm >nul 2>&1
if %errorLevel% neq 0 (
    echo NVM chưa được cài. Đang tải về...
    powershell -Command "Invoke-WebRequest -Uri https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe -OutFile nvm-setup.exe"
    echo Chạy cài đặt NVM...
    start /wait nvm-setup.exe
    del nvm-setup.exe
) else (
    echo NVM đã được cài.
)

echo =============================
echo 2. Cài đặt Node.js v21.7.3
echo =============================

nvm install 21.7.3
nvm use 21.7.3

echo =============================
echo Node.js version:
node -v
echo NPM version:
npm -v

echo =============================
echo 3. Cài dependencies npm
echo =============================

cd /d %~dp0
npm install

echo =============================
echo Hoàn tất cài đặt!
echo Bạn có thể chạy run.bat để khởi động project.
pause