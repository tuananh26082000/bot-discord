@echo off
:: Kiểm tra quyền admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Yêu cầu chạy với quyền Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Chạy npm start
cd /d %~dp0
npm start
pause