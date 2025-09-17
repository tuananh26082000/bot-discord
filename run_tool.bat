@echo off
:: Check Admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️ Please run run.bat as Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Run npm start
cd /d %~dp0
npm start
pause