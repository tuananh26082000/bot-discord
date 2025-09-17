# Discord Bot Controller

## 📦 Yêu cầu cài đặt trước

Để build và chạy bot, bạn cần chuẩn bị các công cụ sau:

1. **Python 3.12**
    - Tải tại: [Python.org](https://www.python.org/downloads/release/python-3120/)
    - Khi cài nhớ tick chọn:  
      ✅ *Add Python to PATH*

2. **Visual Studio Build Tools** (bắt buộc để build `robotjs`)
    - Tải tại: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
    - Khi cài, chọn workload:  
      ✅ *Desktop development with C++*

3. **Node.js & NVM (khuyến nghị)**
    - Cài **NVM for Windows**: [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
    - Sau khi cài, bạn có thể chọn một trong hai phiên bản:

      **Bản ổn định (LTS):**
      ```bat
      nvm install 20.19.4
      nvm use 20.19.4
      ```

      **Bản mới (Electron-compatible):**
      ```bat
      nvm install 21.7.3
      nvm use 21.7.3
      ```

---

## 📥 Cài đặt dependencies

Clone project và cài các gói npm cần thiết:

```bat
npm install discord.js electron jimp screenshot-desktop sharp