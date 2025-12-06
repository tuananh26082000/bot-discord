const { windowManager } = require("node-window-manager");

function manipulateWindow() {
    try {
        windowManager.requestAccessibility();
        console.log("-> Yêu cầu quyền truy cập Trợ năng đã được xử lý.");

        const allWindows = windowManager.getWindows();

        if (allWindows && allWindows.length > 0) {
            console.log("\n==============================================");
            console.log(`🔎 Tìm thấy ${allWindows.length} cửa sổ đang hiển thị:`);

            allWindows.forEach((win, index) => {
                const bounds = win.getBounds();
                console.log(`[${index + 1}] Tiêu đề: "${win.getTitle()}" | Vị trí: X=${bounds.x}, Y=${bounds.y}`);
            });
            console.log("==============================================");
        } else {
            console.log("\n⚠️ Không tìm thấy cửa sổ nào đang hiển thị.");
        }

        const TARGET_TITLE = "Terminal";
        const targetWindow = allWindows.find(win => win.getTitle().includes(TARGET_TITLE));

        if (!targetWindow) {
            console.log(`\n❌ Không tìm thấy cửa sổ có tiêu đề "${TARGET_TITLE}". Không thể thực hiện thao tác.`);
            return;
        }

        targetWindow.bringToTop();
        console.log(`   (Bot targeted.)`);

    } catch (error) {
        console.error("\n❌ Lỗi khi quản lý cửa sổ:", error.message);
        console.error("   *** KHẮC PHỤC: Lỗi này thường do thiếu quyền Trợ năng (Accessibility) hoặc do phiên bản Node.js/package quá cũ. ***");
    }
}

manipulateWindow();