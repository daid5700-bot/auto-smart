"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var admin, kho, xuong, sales, cskh, locGio, ktv1, ktv2, ktv3, c1, c2, c3, c5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Seeding database...");
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "admin@autosmart.vn" },
                            update: {},
                            create: { name: "Nguyễn Văn Admin", email: "admin@autosmart.vn", password: "admin123", role: "ADMIN" },
                        })];
                case 1:
                    admin = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "kho@autosmart.vn" },
                            update: {},
                            create: { name: "Trần Thị Kho", email: "kho@autosmart.vn", password: "kho123", role: "WAREHOUSE" },
                        })];
                case 2:
                    kho = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "xuong@autosmart.vn" },
                            update: {},
                            create: { name: "Lê Văn Xưởng", email: "xuong@autosmart.vn", password: "xuong123", role: "WORKSHOP" },
                        })];
                case 3:
                    xuong = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "sales@autosmart.vn" },
                            update: {},
                            create: { name: "Phạm Thị Sales", email: "sales@autosmart.vn", password: "sales123", role: "SALES" },
                        })];
                case 4:
                    sales = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "cskh@autosmart.vn" },
                            update: {},
                            create: { name: "Hoàng Văn CSKH", email: "cskh@autosmart.vn", password: "cskh123", role: "CRM" },
                        })];
                case 5:
                    cskh = _a.sent();
                    console.log("✅ Users created");
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "LG-001", name: "Lọc gió", category: "Lọc", unit: "Cái", stockCount: 45, stockMin: 10, stockMax: 100, lastImportDate: new Date("2026-05-20"), prices: { create: [{ type: "RETAIL", amount: 150000 }, { type: "WHOLESALE", amount: 120000 }, { type: "INSURANCE", amount: 180000 }] } },
                        })];
                case 6:
                    locGio = _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "LG-001A", name: "Lọc gió thường", parentId: locGio.id, category: "Lọc", unit: "Cái", stockCount: 30, stockMin: 5, stockMax: 50, lastImportDate: new Date("2026-05-20"), prices: { create: [{ type: "RETAIL", amount: 120000 }, { type: "WHOLESALE", amount: 95000 }] } },
                        })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "LG-001B", name: "Lọc gió cao cấp", parentId: locGio.id, category: "Lọc", unit: "Cái", stockCount: 15, stockMin: 5, stockMax: 50, lastImportDate: new Date("2026-05-15"), prices: { create: [{ type: "RETAIL", amount: 250000 }, { type: "WHOLESALE", amount: 200000 }] } },
                        })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "ND-001", name: "Nhớt 5W-30", category: "Nhớt", unit: "Chai", conversionUnit: "Thùng", conversionFactor: 24, stockCount: 120, stockMin: 24, stockMax: 240, lastImportDate: new Date("2026-06-01"), prices: { create: [{ type: "RETAIL", amount: 250000 }, { type: "WHOLESALE", amount: 200000 }] } },
                        })];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "MP-001", name: "Má phanh trước", category: "Phanh", unit: "Bộ", stockCount: 8, stockMin: 10, stockMax: 40, lastImportDate: new Date("2026-04-10"), prices: { create: [{ type: "RETAIL", amount: 850000 }, { type: "WHOLESALE", amount: 700000 }] } },
                        })];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "BQ-001", name: "Bình ắc quy 12V", category: "Điện", unit: "Cái", stockCount: 5, stockMin: 3, stockMax: 20, lastImportDate: new Date("2026-06-05"), prices: { create: [{ type: "RETAIL", amount: 2500000 }] } },
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "LD-001", name: "Lọc dầu", category: "Lọc", unit: "Cái", stockCount: 50, stockMin: 10, stockMax: 80, lastImportDate: new Date("2026-06-10"), prices: { create: [{ type: "RETAIL", amount: 120000 }, { type: "WHOLESALE", amount: 90000 }] } },
                        })];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.create({
                            data: { sku: "BL-001", name: "Bóng đèn LED H4", category: "Đèn", unit: "Cặp", stockCount: 2, stockMin: 5, stockMax: 30, lastImportDate: new Date("2026-03-01"), prices: { create: [{ type: "RETAIL", amount: 450000 }] } },
                        })];
                case 13:
                    _a.sent();
                    console.log("✅ Products created");
                    return [4 /*yield*/, prisma.technician.create({ data: { code: "KTV-001", name: "Nguyễn Văn Hải", phone: "0911111111", status: "WORKING", commissionRate: 10 } })];
                case 14:
                    ktv1 = _a.sent();
                    return [4 /*yield*/, prisma.technician.create({ data: { code: "KTV-002", name: "Trần Minh Đức", phone: "0922222222", status: "IDLE", commissionRate: 10 } })];
                case 15:
                    ktv2 = _a.sent();
                    return [4 /*yield*/, prisma.technician.create({ data: { code: "KTV-003", name: "Lê Quang Vinh", phone: "0933333333", status: "WORKING", commissionRate: 12 } })];
                case 16:
                    ktv3 = _a.sent();
                    return [4 /*yield*/, prisma.technician.create({ data: { code: "KTV-004", name: "Phạm Thanh Tùng", phone: "0944444444", status: "IDLE", commissionRate: 8 } })];
                case 17:
                    _a.sent();
                    console.log("✅ Technicians created");
                    return [4 /*yield*/, prisma.customer.create({ data: { name: "Nguyễn Minh Tuấn", phone: "0912345678", email: "tuan@gmail.com", source: "WALKIN", loyaltyPoints: 2500, totalSpent: 45000000, lastVisit: new Date("2026-06-10"), vehiclePlates: ["51A-123.45"], tags: ["VIP"] } })];
                case 18:
                    c1 = _a.sent();
                    return [4 /*yield*/, prisma.customer.create({ data: { name: "Trần Thị Hương", phone: "0987654321", source: "FACEBOOK", loyaltyPoints: 800, totalSpent: 12000000, lastVisit: new Date("2026-05-20"), vehiclePlates: ["30A-678.90"], tags: [] } })];
                case 19:
                    c2 = _a.sent();
                    return [4 /*yield*/, prisma.customer.create({ data: { name: "Lê Hoàng Nam", phone: "0909123456", source: "WEBSITE", loyaltyPoints: 5200, totalSpent: 89000000, lastVisit: new Date("2026-06-12"), vehiclePlates: ["51A-234.56", "51B-789.01"], tags: ["VIP", "Fleet"] } })];
                case 20:
                    c3 = _a.sent();
                    return [4 /*yield*/, prisma.customer.create({ data: { name: "Phạm Văn Đức", phone: "0938765432", source: "REFERRAL", loyaltyPoints: 150, totalSpent: 3500000, lastVisit: new Date("2026-04-01"), vehiclePlates: ["29A-111.22"], tags: [] } })];
                case 21:
                    _a.sent();
                    return [4 /*yield*/, prisma.customer.create({ data: { name: "Võ Thị Mai", phone: "0971234567", source: "WALKIN", loyaltyPoints: 1200, totalSpent: 22000000, lastVisit: new Date("2026-06-08"), vehiclePlates: ["51A-555.66"], tags: [] } })];
                case 22:
                    c5 = _a.sent();
                    console.log("✅ Customers created");
                    // ===== VEHICLES =====
                    return [4 /*yield*/, prisma.vehicle.createMany({ data: [
                                { vin: "JTDKN3DU5A0123456", engineNumber: "2ZR-FE-1234", model: "Toyota Camry", variant: "2.5Q", color: "Đen", year: 2026, status: "AVAILABLE", listPrice: 1100000000, floorPrice: 1050000000 },
                                { vin: "WBAPH5C55BA123456", engineNumber: "N20B20-5678", model: "BMW 320i", variant: "Sport Line", color: "Trắng", year: 2026, status: "AVAILABLE", listPrice: 1750000000, floorPrice: 1680000000 },
                                { vin: "MHKA5A61MKJ123456", model: "Toyota Vios", variant: "1.5G CVT", color: "Bạc", year: 2026, status: "RESERVED", listPrice: 545000000, floorPrice: 520000000 },
                                { vin: "RLHGD58809T123456", model: "Honda City", variant: "RS", color: "Đỏ", year: 2026, status: "INCOMING", listPrice: 599000000, floorPrice: 575000000 },
                                { vin: "KNAGM4A70G5123456", model: "Kia Seltos", variant: "1.6 Turbo", color: "Xanh", year: 2025, status: "SOLD", listPrice: 719000000, floorPrice: 690000000, customerId: c1.id },
                            ] })];
                case 23:
                    // ===== VEHICLES =====
                    _a.sent();
                    console.log("✅ Vehicles created");
                    // ===== REPAIR ORDERS =====
                    return [4 /*yield*/, prisma.repairOrder.create({ data: { customerId: c1.id, plateNumber: "51A-123.45", vehicleModel: "Toyota Camry 2.5Q", kmIn: 45000, symptoms: "Tiếng kêu khi phanh, đèn check engine sáng", status: "DOING", technicianId: ktv1.id, laborCost: 500000, partsCost: 970000, totalAmount: 1470000, createdById: xuong.id } })];
                case 24:
                    // ===== REPAIR ORDERS =====
                    _a.sent();
                    return [4 /*yield*/, prisma.repairOrder.create({ data: { customerId: c3.id, plateNumber: "51A-234.56", vehicleModel: "BMW 320i Sport", kmIn: 30000, symptoms: "Bảo dưỡng định kỳ 30.000km", status: "WAITING_PARTS", technicianId: ktv3.id, laborCost: 800000, partsCost: 1270000, totalAmount: 2070000, createdById: xuong.id } })];
                case 25:
                    _a.sent();
                    return [4 /*yield*/, prisma.repairOrder.create({ data: { customerId: c5.id, plateNumber: "51A-555.66", vehicleModel: "Honda City RS", kmIn: 15000, symptoms: "Thay nhớt, kiểm tra tổng quát", status: "DONE", technicianId: ktv2.id, laborCost: 300000, partsCost: 1000000, totalAmount: 1300000, completedAt: new Date("2026-06-11"), createdById: xuong.id } })];
                case 26:
                    _a.sent();
                    return [4 /*yield*/, prisma.repairOrder.create({ data: { customerId: c2.id, plateNumber: "30A-678.90", vehicleModel: "Toyota Vios 1.5G", kmIn: 60000, symptoms: "Thay bóng đèn pha, check điện", status: "PENDING", laborCost: 200000, partsCost: 450000, totalAmount: 650000, createdById: xuong.id } })];
                case 27:
                    _a.sent();
                    console.log("✅ Repair Orders created");
                    // ===== LEADS =====
                    return [4 /*yield*/, prisma.lead.createMany({ data: [
                                { name: "Đặng Văn Hùng", phone: "0901234567", source: "FACEBOOK", status: "NEW", interest: "Toyota Camry 2026" },
                                { name: "Bùi Thị Lan", phone: "0918765432", source: "WEBSITE", status: "CONSULTING", interest: "Bảo dưỡng 10.000km", assignedToId: cskh.id },
                                { name: "Nguyễn Minh Tuấn", phone: "0912345678", source: "WALKIN", status: "POTENTIAL", interest: "BMW 320i Sport", assignedToId: sales.id, customerId: c1.id },
                                { name: "Trương Quốc Bảo", phone: "0945678901", source: "REFERRAL", status: "CONVERTED", interest: "Kia Seltos 1.6 Turbo" },
                                { name: "Lý Thị Nhung", phone: "0967890123", source: "FACEBOOK", status: "LOST", interest: "Honda City RS" },
                            ] })];
                case 28:
                    // ===== LEADS =====
                    _a.sent();
                    console.log("✅ Leads created");
                    // ===== ZNS LOGS =====
                    return [4 /*yield*/, prisma.znsLog.createMany({ data: [
                                { customerId: c1.id, phone: "84912345678", messageType: "THANK_YOU", content: "Cảm ơn anh Tuấn đã sử dụng dịch vụ!", status: "SENT" },
                                { customerId: c5.id, phone: "84971234567", messageType: "MAINTENANCE", content: "Xe chị Mai đã đến lịch thay dầu!", status: "SENT" },
                                { customerId: c2.id, phone: "84987654321", messageType: "BIRTHDAY", content: "Chúc mừng sinh nhật! Voucher giảm 10%!", status: "SENT" },
                                { customerId: c3.id, phone: "84909123456", messageType: "PROMOTION", content: "Ưu đãi VIP - Giảm 15% dịch vụ!", status: "FAILED", error: "Invalid phone format" },
                            ] })];
                case 29:
                    // ===== ZNS LOGS =====
                    _a.sent();
                    console.log("✅ ZNS Logs created");
                    console.log("🎉 Seeding complete!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) { console.error(e); process.exit(1); })
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, prisma.$disconnect()];
        case 1:
            _a.sent();
            return [2 /*return*/];
    }
}); }); });
