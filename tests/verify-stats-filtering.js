"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const BASE_URL = "http://127.0.0.1:3000";
const COOKIE = "user_role=ADMIN; active_branch_id=1";
const prisma = new client_1.PrismaClient();
async function runTests() {
    console.log("⚡ BẮT ĐẦU KIỂM TRA BỘ LỌC THỜI GIAN CỦA CÁC TRANG THỐNG KÊ...");
    let pass = true;
    // Helper assertions
    function assert(condition, message) {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
        }
        else {
            console.error(`❌ [FAIL] ${message}`);
            pass = false;
        }
    }
    try {
        // ----------------------------------------------------
        // TEST CASE 1: THỐNG KÊ KINH DOANH (SALES STATS)
        // ----------------------------------------------------
        console.log("\n--- 📊 KIỂM TRA THỐNG KÊ KINH DOANH (SALES) ---");
        // Lấy thử dữ liệu không lọc để so sánh
        const salesAllRes = await fetch(`${BASE_URL}/api/stats/sales`, {
            headers: { "Cookie": COOKIE }
        });
        if (!salesAllRes.ok)
            throw new Error(`Không thể fetch API /api/stats/sales: Status ${salesAllRes.status}`);
        const salesAll = await salesAllRes.json();
        console.log(`Tất cả lịch sử bán xe: ${salesAll.soldVehicles} xe, doanh số: ${salesAll.soldValue}đ`);
        // Lọc thời hạn tương lai (không có xe nào được cập nhật/bán vào năm 2030)
        const salesFutureRes = await fetch(`${BASE_URL}/api/stats/sales?startDate=2030-01-01&endDate=2030-12-31`, {
            headers: { "Cookie": COOKIE }
        });
        const salesFuture = await salesFutureRes.json();
        assert(salesFuture.soldVehicles === 0, "Thống kê tương lai: Số xe bán được phải là 0");
        assert(salesFuture.soldValue === 0, "Thống kê tương lai: Doanh số xe bán được phải là 0");
        assert(salesFuture.soldList.length === 0, "Thống kê tương lai: Danh sách xe bán được phải rỗng");
        assert(salesFuture.topModels.length === 0, "Thống kê tương lai: Top model bán được phải rỗng");
        // Lọc thời hạn lịch sử thực tế (Từ 2026-06-01 đến 2026-06-30)
        const salesFilterRes = await fetch(`${BASE_URL}/api/stats/sales?startDate=2026-06-01&endDate=2026-06-30`, {
            headers: { "Cookie": COOKIE }
        });
        const salesFilter = await salesFilterRes.json();
        assert(Array.isArray(salesFilter.soldList), "Thống kê lọc: Trả về danh sách xe bán");
        let allSalesWithinRange = true;
        salesFilter.soldList.forEach((item) => {
            const d = new Date(item.updatedAt);
            const start = new Date("2026-06-01T00:00:00.000Z");
            const end = new Date("2026-06-30T23:59:59.999Z");
            if (d < start || d > end) {
                allSalesWithinRange = false;
                console.error(`Xe có ngày cập nhật ngoài khoảng lọc: ID ${item.id}, updatedAt: ${item.updatedAt}`);
            }
        });
        assert(allSalesWithinRange, "Tất cả các bản ghi xe bán được trả về phải nằm trong khoảng thời gian lọc");
        // ----------------------------------------------------
        // TEST CASE 2: THỐNG KÊ DỊCH VỤ (WORKSHOP STATS)
        // ----------------------------------------------------
        console.log("\n--- 🛠️ KIỂM TRA THỐNG KÊ DỊCH VỤ (WORKSHOP) ---");
        // Lấy thử dữ liệu không lọc
        const wsAllRes = await fetch(`${BASE_URL}/api/stats/workshop`, {
            headers: { "Cookie": COOKIE }
        });
        if (!wsAllRes.ok)
            throw new Error("Không thể fetch API /api/stats/workshop");
        const wsAll = await wsAllRes.json();
        console.log(`Tất cả lịch sử dịch vụ: ${wsAll.totalROs} lệnh, doanh thu: ${wsAll.revenue.total}đ`);
        // Lọc thời hạn tương lai (2030)
        const wsFutureRes = await fetch(`${BASE_URL}/api/stats/workshop?startDate=2030-01-01&endDate=2030-12-31`, {
            headers: { "Cookie": COOKIE }
        });
        const wsFuture = await wsFutureRes.json();
        assert(wsFuture.totalROs === 0, "Thống kê dịch vụ tương lai: Tổng số lệnh phải là 0");
        assert(wsFuture.activeROs === 0, "Thống kê dịch vụ tương lai: Lệnh đang hoạt động phải là 0");
        assert(wsFuture.revenue.total === 0, "Thống kê dịch vụ tương lai: Tổng doanh thu phải là 0đ");
        assert(wsFuture.revenue.labor === 0, "Thống kê dịch vụ tương lai: Doanh thu tiền công phải là 0đ");
        assert(wsFuture.revenue.parts === 0, "Thống kê dịch vụ tương lai: Doanh thu phụ tùng phải là 0đ");
        let allTechsZero = true;
        wsFuture.technicianPerformance.forEach((tech) => {
            if (tech.completedCount > 0 || tech.totalRevenue > 0) {
                allTechsZero = false;
            }
        });
        assert(allTechsZero, "Thống kê dịch vụ tương lai: Hiệu suất toàn bộ KTV phải bằng 0");
        // Lọc thời hạn thực tế (2026-06-01 đến 2026-06-30)
        const wsFilterRes = await fetch(`${BASE_URL}/api/stats/workshop?startDate=2026-06-01&endDate=2026-06-30`, {
            headers: { "Cookie": COOKIE }
        });
        const wsFilter = await wsFilterRes.json();
        // Lấy trực tiếp từ db để kiểm tra chéo
        const countDb = await prisma.repairOrder.count({
            where: {
                createdAt: {
                    gte: new Date("2026-06-01T00:00:00.000Z"),
                    lte: new Date("2026-06-30T23:59:59.999Z")
                }
            }
        });
        assert(wsFilter.totalROs === countDb, `Số lượng lệnh dịch vụ trả về khớp với DB (${wsFilter.totalROs} ROs)`);
        // ----------------------------------------------------
        // TEST CASE 3: THỐNG KÊ PHỤ TÙNG/KHO (INVENTORY STATS)
        // ----------------------------------------------------
        console.log("\n--- 📦 KIỂM TRA THỐNG KÊ KHO PHỤ TÙNG (INVENTORY) ---");
        // Lọc thời hạn tương lai (2030)
        const invFutureRes = await fetch(`${BASE_URL}/api/stats/inventory?startDate=2030-01-01&endDate=2030-12-31`, {
            headers: { "Cookie": COOKIE }
        });
        const invFuture = await invFutureRes.json();
        assert(invFuture.recentMovements.length === 0, "Thống kê kho tương lai: Biến động gần đây phải rỗng");
        assert(invFuture.totalSoldQty === 0, "Thống kê kho tương lai: Số lượng bán ra phải là 0");
        assert(invFuture.totalSoldAmount === 0, "Thống kê kho tương lai: Doanh thu bán phụ tùng phải là 0đ");
        assert(invFuture.exports.length === 0, "Thống kê kho tương lai: Danh sách xuất kho rỗng");
        // Lọc thời hạn thực tế (2026-06-01 đến 2026-06-30)
        const invFilterRes = await fetch(`${BASE_URL}/api/stats/inventory?startDate=2026-06-01&endDate=2026-06-30`, {
            headers: { "Cookie": COOKIE }
        });
        const invFilter = await invFilterRes.json();
        let allMovementsWithinRange = true;
        invFilter.recentMovements.forEach((mov) => {
            const d = new Date(mov.createdAt);
            const start = new Date("2026-06-01T00:00:00.000Z");
            const end = new Date("2026-06-30T23:59:59.999Z");
            if (d < start || d > end) {
                allMovementsWithinRange = false;
            }
        });
        assert(allMovementsWithinRange, "Tất cả biến động kho gần đây trả về nằm trong khoảng thời gian lọc");
        let allExportsWithinRange = true;
        invFilter.exports.forEach((mov) => {
            const d = new Date(mov.createdAt);
            const start = new Date("2026-06-01T00:00:00.000Z");
            const end = new Date("2026-06-30T23:59:59.999Z");
            if (d < start || d > end) {
                allExportsWithinRange = false;
            }
        });
        assert(allExportsWithinRange, "Tất cả các xuất kho bán phụ tùng trả về nằm trong khoảng thời gian lọc");
        console.log("\n----------------------------------------------------");
        if (pass) {
            console.log("🎉 TẤT CẢ TEST CASE KIỂM TRA BỘ LỌC THỜI GIAN ĐÃ THÀNH CÔNG RỰC RỠ!");
        }
        else {
            console.error("❌ MỘT SỐ TEST CASE KIỂM TRA BỘ LỌC THỜI GIAN ĐÃ THẤT BẠI. CẦN KIỂM TRA LẠI!");
        }
    }
    catch (err) {
        console.error("Lỗi trong quá trình chạy test:", err);
        pass = false;
    }
    finally {
        await prisma.$disconnect();
        process.exit(pass ? 0 : 1);
    }
}
runTests();
