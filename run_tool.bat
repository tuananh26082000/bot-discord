@echo off
:: Kiểm tra quyền admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Yêu cầu chạy với quyền Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Chạy với Node từ NVM
setlocal
:: Thay 21.7.3 bằng version bạn dùng trong nvm
for /f "tokens=*" %%i in ('nvm root') do set NVM_HOME=%%i
set NVM_SYMLINK=%NVM_HOME%\v21.7.3
set PATH=%NVM_SYMLINK%;%NVM_SYMLINK%\node_modules\npm\bin;%PATH%

:: Chạy npm start
cd /d %~dp0
call npm start

endlocal
pause