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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = __importDefault(require("assert"));
var prisma_1 = require("../src/lib/prisma");
var actions_1 = require("../src/app/actions");
var utils_1 = require("../src/lib/utils");
var middleware_1 = require("../src/middleware");
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        function test(name, fn) {
            testCount++;
            try {
                var res = fn();
                if (res instanceof Promise) {
                    res.then(function () {
                        console.log("\u2705 Test Case ".concat(testCount, ": ").concat(name, " - TH\u00C0NH C\u00D4NG"));
                        passedCount++;
                    }).catch(function (err) {
                        console.error("\u274C Test Case ".concat(testCount, ": ").concat(name, " - TH\u1EA4T B\u1EA0I"));
                        console.error(err);
                    });
                }
                else {
                    console.log("\u2705 Test Case ".concat(testCount, ": ").concat(name, " - TH\u00C0NH C\u00D4NG"));
                    passedCount++;
                }
            }
            catch (err) {
                console.error("\u274C Test Case ".concat(testCount, ": ").concat(name, " - TH\u1EA4T B\u1EA0I"));
                console.error(err);
            }
        }
        var testCount, passedCount;
        var _this = this;
        return __generator(this, function (_a) {
            console.log("🚀 BẮT ĐẦU CHẠY 19 UNIT TEST CASES CHO AUTO-SMART NEXT-GEN...\n");
            testCount = 0;
            passedCount = 0;
            // 1. Phân hệ Quản lý Phụ tùng (Inventory)
            // Test Case 1: Tính giá trung bình khi quy đổi
            test("Tính giá trung bình khi quy đổi (WAC)", function () { return __awaiter(_this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, actions_1.importStock)({
                                productId: 1, // Dùng ID 1 của sản phẩm đã seed
                                quantity: 1,
                                unitCost: 2400000,
                                conversionFactor: 24
                            })];
                        case 1:
                            result = _a.sent();
                            assert_1.default.strictEqual(result.avgCost, 100000);
                            return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 2: Cập nhật tồn kho sau khi bán lẻ
            test("Cập nhật tồn kho sau khi bán lẻ", function () { return __awaiter(_this, void 0, void 0, function () {
                var prod, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.product.create({
                                data: {
                                    sku: "TEST-INV-02",
                                    name: "Dầu Nhớt Test",
                                    unit: "Chai",
                                    stockCount: 24,
                                    stockMin: 5,
                                    stockMax: 100,
                                }
                            })];
                        case 1:
                            prod = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 5, 7]);
                            // Bán 2 chai
                            return [4 /*yield*/, (0, actions_1.sellItem)(prod.id, 2)];
                        case 3:
                            // Bán 2 chai
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.findUnique({ where: { id: prod.id } })];
                        case 4:
                            updated = _a.sent();
                            assert_1.default.strictEqual(updated === null || updated === void 0 ? void 0 : updated.stockCount, 22);
                            return [3 /*break*/, 7];
                        case 5: 
                        // Dọn dẹp
                        return [4 /*yield*/, prisma_1.prisma.product.delete({ where: { id: prod.id } })];
                        case 6:
                            // Dọn dẹp
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 3: Xử lý quy đổi không chia hết
            test("Xử lý quy đổi không chia hết (Ném lỗi khi factor <= 0)", function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, assert_1.default.rejects((0, actions_1.importStock)({
                                productId: 1,
                                quantity: 1,
                                unitCost: 2400000,
                                conversionFactor: 0
                            }), /Conversion factor must be greater than 0/)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 4: Tự động chọn bảng giá theo loại khách
            test("Tự động chọn bảng giá theo loại khách hàng", function () {
                var mockProduct = {
                    prices: [
                        { type: "RETAIL", amount: 500000 },
                        { type: "WHOLESALE", amount: 400000 }
                    ]
                };
                var price = (0, utils_1.getPriceForCustomer)(mockProduct, "Đại lý");
                assert_1.default.strictEqual(price, 400000);
            });
            // Test Case 5: Ưu tiên bảng giá thiết lập thủ công
            test("Ưu tiên bảng giá ghi đè thiết lập thủ công", function () {
                var mockProduct = {
                    prices: [
                        { type: "RETAIL", amount: 500000 },
                        { type: "WHOLESALE", amount: 400000 }
                    ]
                };
                var finalPrice = (0, utils_1.getFinalPrice)(mockProduct, "Đại lý", 350000);
                assert_1.default.strictEqual(finalPrice, 350000);
            });
            // Test Case 6: Kiểm tra ngưỡng tồn kho thấp/cao
            test("Cảnh báo khi tồn kho dưới ngưỡng an toàn", function () {
                var mockProduct = { stockCount: 4, stockMin: 5 };
                var status = (0, utils_1.checkStockWarning)(mockProduct);
                assert_1.default.strictEqual(status, "LOW_STOCK_WARNING");
            });
            // Test Case 7: Cảnh báo hàng tồn kho lâu ngày
            test("Cảnh báo hàng tồn kho lâu ngày (SLOW_MOVING)", function () {
                var hundredDaysAgo = new Date();
                hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
                var mockProduct = { lastImportDate: hundredDaysAgo };
                var status = (0, utils_1.checkSlowMoving)(mockProduct);
                assert_1.default.strictEqual(status, "SLOW_MOVING");
            });
            // 2. Phân hệ Xưởng dịch vụ (Workshop)
            // Test Case 8: Thay đổi trạng thái lệnh (Workflow)
            test("Thay đổi trạng thái lệnh sửa chữa sang DONE cập nhật completedAt", function () { return __awaiter(_this, void 0, void 0, function () {
                var customer, ro, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.customer.findFirst()];
                        case 1:
                            customer = _a.sent();
                            if (!customer)
                                throw new Error("Chưa seed khách hàng");
                            return [4 /*yield*/, prisma_1.prisma.repairOrder.create({
                                    data: {
                                        customerId: customer.id,
                                        plateNumber: "29A-999.99",
                                        vehicleModel: "BMW M5",
                                        status: "PENDING",
                                        laborCost: 100000,
                                        partsCost: 0,
                                        totalAmount: 100000,
                                    }
                                })];
                        case 2:
                            ro = _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, , 5, 7]);
                            return [4 /*yield*/, (0, actions_1.updateROStatus)({ repairOrderId: ro.id, newStatus: "DONE" })];
                        case 4:
                            result = _a.sent();
                            assert_1.default.ok(result.ro.completedAt);
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, prisma_1.prisma.repairOrder.delete({ where: { id: ro.id } }).catch(function () { })];
                        case 6:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 9: Tính tổng tiền Bill tự động
            test("Tính tổng tiền Bill tự động (Labor + Parts)", function () { return __awaiter(_this, void 0, void 0, function () {
                var customer, product, ro, updatedRo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.customer.findFirst()];
                        case 1:
                            customer = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.create({
                                    data: {
                                        sku: "TEST-INV-09",
                                        name: "Má phanh Test",
                                        unit: "Bộ",
                                        stockCount: 10,
                                        prices: { create: { type: "RETAIL", amount: 200000 } }
                                    }
                                })];
                        case 2:
                            product = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.repairOrder.create({
                                    data: {
                                        customerId: customer.id,
                                        plateNumber: "29A-888.88",
                                        vehicleModel: "Lexus RX",
                                        status: "PENDING",
                                        laborCost: 100000,
                                        partsCost: 0,
                                        totalAmount: 100000,
                                    }
                                })];
                        case 3:
                            ro = _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, , 7, 10]);
                            return [4 /*yield*/, (0, actions_1.exportStockForRO)({
                                    repairOrderId: ro.id,
                                    productId: product.id,
                                    quantity: 1,
                                    priceType: "RETAIL"
                                })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.repairOrder.findUnique({ where: { id: ro.id } })];
                        case 6:
                            updatedRo = _a.sent();
                            assert_1.default.strictEqual(Number(updatedRo === null || updatedRo === void 0 ? void 0 : updatedRo.totalAmount), 300000); // 100k công + 200k phụ tùng
                            return [3 /*break*/, 10];
                        case 7: return [4 /*yield*/, prisma_1.prisma.repairOrder.delete({ where: { id: ro.id } }).catch(function () { })];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.delete({ where: { id: product.id } }).catch(function () { })];
                        case 9:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 10: Tính hoa hồng KTV
            test("Tính hoa hồng cho Kỹ thuật viên khi hoàn thành lệnh", function () { return __awaiter(_this, void 0, void 0, function () {
                var customer, tech, ro, perf;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.customer.findFirst()];
                        case 1:
                            customer = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.technician.create({
                                    data: { code: "T_TEST_10", name: "Thợ Test 10", commissionRate: 5 }
                                })];
                        case 2:
                            tech = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.repairOrder.create({
                                    data: {
                                        customerId: customer.id,
                                        plateNumber: "29A-777.77",
                                        vehicleModel: "Audi R8",
                                        status: "REPAIRING",
                                        technicianId: tech.id,
                                        laborCost: 1000000,
                                        partsCost: 0,
                                        totalAmount: 1000000,
                                    }
                                })];
                        case 3:
                            ro = _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, , 7, 10]);
                            return [4 /*yield*/, (0, actions_1.updateROStatus)({ repairOrderId: ro.id, newStatus: "DONE" })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.techPerformance.findFirst({ where: { repairOrderId: ro.id } })];
                        case 6:
                            perf = _a.sent();
                            assert_1.default.strictEqual(Number(perf === null || perf === void 0 ? void 0 : perf.commissionAmount), 50000); // 5% của 1M = 50.000đ
                            return [3 /*break*/, 10];
                        case 7: return [4 /*yield*/, prisma_1.prisma.repairOrder.delete({ where: { id: ro.id } }).catch(function () { })];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.technician.delete({ where: { id: tech.id } }).catch(function () { })];
                        case 9:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 11: Liên kết Kho - Xưởng
            test("Xuất kho cập nhật tồn kho phụ tùng dầu nhớt", function () { return __awaiter(_this, void 0, void 0, function () {
                var customer, product, ro, updatedProduct;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.customer.findFirst()];
                        case 1:
                            customer = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.create({
                                    data: {
                                        sku: "OIL-TEST-11",
                                        name: "Dầu động cơ Test 11",
                                        unit: "Hộp",
                                        stockCount: 5,
                                        prices: { create: { type: "RETAIL", amount: 150000 } }
                                    }
                                })];
                        case 2:
                            product = _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.repairOrder.create({
                                    data: {
                                        customerId: customer.id,
                                        plateNumber: "29A-666.66",
                                        vehicleModel: "Honda Civic",
                                        status: "PENDING",
                                        laborCost: 50000,
                                    }
                                })];
                        case 3:
                            ro = _a.sent();
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, , 7, 10]);
                            return [4 /*yield*/, (0, actions_1.exportStockForRO)({
                                    repairOrderId: ro.id,
                                    productId: product.id,
                                    quantity: 1,
                                    priceType: "RETAIL"
                                })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.findUnique({ where: { id: product.id } })];
                        case 6:
                            updatedProduct = _a.sent();
                            assert_1.default.strictEqual(updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.stockCount, 4); // Giảm đi 1
                            return [3 /*break*/, 10];
                        case 7: return [4 /*yield*/, prisma_1.prisma.repairOrder.delete({ where: { id: ro.id } }).catch(function () { })];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, prisma_1.prisma.product.delete({ where: { id: product.id } }).catch(function () { })];
                        case 9:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            // 3. Phân hệ Bán xe (Sales)
            // Test Case 12: Kiểm tra trùng mã số khung (VIN)
            test("Ngăn chặn tạo xe trùng mã số khung (VIN)", function () { return __awaiter(_this, void 0, void 0, function () {
                var vin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            vin = "VIN-DUPLICATE-12";
                            return [4 /*yield*/, prisma_1.prisma.vehicle.create({
                                    data: { vin: vin, model: "Hyundai SantaFe", listPrice: 1000000000, floorPrice: 950000000, year: 2026 }
                                })];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 4, 6]);
                            return [4 /*yield*/, assert_1.default.rejects(prisma_1.prisma.vehicle.create({
                                    data: { vin: vin, model: "Hyundai Tucson", listPrice: 800000000, floorPrice: 750000000, year: 2026 }
                                }))];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, prisma_1.prisma.vehicle.delete({ where: { vin: vin } })];
                        case 5:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // Test Case 13: Cập nhật trạng thái xe đặt cọc
            test("Cập nhật trạng thái xe sang RESERVED", function () { return __awaiter(_this, void 0, void 0, function () {
                var vehicle, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, prisma_1.prisma.vehicle.create({
                                data: { vin: "VIN-TEST-13", model: "Kia Seltos", listPrice: 650000000, floorPrice: 620000000, year: 2026, status: "AVAILABLE" }
                            })];
                        case 1:
                            vehicle = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 4, 6]);
                            return [4 /*yield*/, prisma_1.prisma.vehicle.update({
                                    where: { id: vehicle.id },
                                    data: { status: "RESERVED" }
                                })];
                        case 3:
                            updated = _a.sent();
                            assert_1.default.strictEqual(updated.status, "RESERVED");
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, prisma_1.prisma.vehicle.delete({ where: { id: vehicle.id } })];
                        case 5:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // 4. Phân hệ Chăm sóc khách hàng (CRM)
            // Test Case 14: Tích điểm sau thanh toán
            test("Tích điểm khách hàng dựa trên tỷ lệ thanh toán", function () {
                var points = (0, utils_1.calculatePoints)(10000000, 1); // 10 triệu * 1%
                assert_1.default.strictEqual(points, 100000);
            });
            // Test Case 15: Sử dụng điểm để giảm giá
            test("Sử dụng điểm Loyalty để trừ hóa đơn", function () {
                var _a = (0, utils_1.redeemPoints)(50000, 500000), finalBill = _a.finalBill, remainingPoints = _a.remainingPoints;
                assert_1.default.strictEqual(finalBill, 450000);
                assert_1.default.strictEqual(remainingPoints, 0);
            });
            // Test Case 16: Tính ngày nhắc lịch thay dầu
            test("Tính toán ngày nhắc lịch thay dầu bảo dưỡng định kỳ", function () {
                var lastChange = new Date("2024-01-01");
                var nextDate = (0, utils_1.calculateNextOilChange)(lastChange, 6);
                assert_1.default.strictEqual(nextDate.getMonth(), 6); // Tháng 7 (Index 6)
                assert_1.default.strictEqual(nextDate.getDate(), 1);
            });
            // Test Case 17: Gửi tin ZNS giả lập
            test("Gửi tin nhắn ZNS giả lập và xác minh payload nhận được", function () { return __awaiter(_this, void 0, void 0, function () {
                var res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, actions_1.sendZNSMock)("0901234567", "T_THANK_YOU", { name: "Hùng" })];
                        case 1:
                            res = _a.sent();
                            assert_1.default.strictEqual(res.success, true);
                            assert_1.default.strictEqual(res.sentTo, "0901234567");
                            assert_1.default.strictEqual(res.payload.name, "Hùng");
                            return [2 /*return*/];
                    }
                });
            }); });
            // 5. Phân quyền & Bảo mật (Auth & RBAC)
            // Test Case 18: Phân quyền Middleware
            test("Middleware chặn truy cập trái phép của vai trò Sales", function () {
                var _a;
                var mockRequest = {
                    nextUrl: { pathname: "/inventory/settings" },
                    cookies: {
                        get: function (name) {
                            if (name === "user_role")
                                return { value: "SALES" };
                            return undefined;
                        }
                    },
                    url: "http://localhost:3000/inventory/settings"
                };
                var response = (0, middleware_1.middleware)(mockRequest);
                // Sales chỉ có quyền truy cập /sales và /crm, nên truy cập /inventory/settings sẽ bị chuyển hướng
                assert_1.default.ok((_a = response === null || response === void 0 ? void 0 : response.headers.get("location")) === null || _a === void 0 ? void 0 : _a.includes("/sales"));
            });
            // Test Case 19: Kiểm tra Token hết hạn (Thiếu cookie trả về redirect/error)
            test("Middleware redirect về login khi không có cookie session", function () {
                var _a;
                var mockRequest = {
                    nextUrl: { pathname: "/admin" },
                    cookies: {
                        get: function () { return undefined; }
                    },
                    url: "http://localhost:3000/admin"
                };
                var response = (0, middleware_1.middleware)(mockRequest);
                assert_1.default.ok((_a = response === null || response === void 0 ? void 0 : response.headers.get("location")) === null || _a === void 0 ? void 0 : _a.includes("/login"));
            });
            setTimeout(function () {
                console.log("\n\uD83C\uDF89 HO\u00C0N TH\u00C0NH: \u0110\u00E3 v\u01B0\u1EE3t qua ".concat(passedCount, "/").concat(testCount, " test cases!"));
            }, 4000);
            return [2 /*return*/];
        });
    });
}
runTests();
