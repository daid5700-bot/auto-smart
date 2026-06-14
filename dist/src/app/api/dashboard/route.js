"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.GET = GET;
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
// GET /api/dashboard — aggregate stats
function GET() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, totalProducts, lowStockProducts, totalCustomers, totalLeads, activeROs, totalVehicles, availableVehicles, znsToday, repairOrders, revenueData, recentLeads, lowStockParts, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, Promise.all([
                            prisma_1.prisma.product.count(),
                            prisma_1.prisma.product.count({ where: { stockCount: { lte: prisma_1.prisma.product.fields.stockMin } } }).catch(function () {
                                // fallback: raw query if field comparison not supported
                                return prisma_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT COUNT(*) as count FROM \"Product\" WHERE \"stockCount\" <= \"stockMin\""], ["SELECT COUNT(*) as count FROM \"Product\" WHERE \"stockCount\" <= \"stockMin\""]))).then(function (r) { var _a, _b; return Number((_b = (_a = r[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0); });
                            }),
                            prisma_1.prisma.customer.count(),
                            prisma_1.prisma.lead.count({ where: { status: { in: ["NEW", "CONSULTING", "POTENTIAL"] } } }),
                            prisma_1.prisma.repairOrder.count({ where: { status: { notIn: ["DONE", "DELIVERED"] } } }),
                            prisma_1.prisma.vehicle.count(),
                            prisma_1.prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
                            prisma_1.prisma.znsLog.count({ where: { sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
                            prisma_1.prisma.repairOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { customer: true, technician: true } }),
                            prisma_1.prisma.repairOrder.groupBy({
                                by: ["createdAt"],
                                _sum: { totalAmount: true },
                                orderBy: { createdAt: "asc" },
                            }),
                        ])];
                case 1:
                    _a = _b.sent(), totalProducts = _a[0], lowStockProducts = _a[1], totalCustomers = _a[2], totalLeads = _a[3], activeROs = _a[4], totalVehicles = _a[5], availableVehicles = _a[6], znsToday = _a[7], repairOrders = _a[8], revenueData = _a[9];
                    return [4 /*yield*/, prisma_1.prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 })];
                case 2:
                    recentLeads = _b.sent();
                    return [4 /*yield*/, prisma_1.prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT id, name, sku, \"stockCount\", \"stockMin\" FROM \"Product\" WHERE \"stockCount\" <= \"stockMin\" AND status = 'ACTIVE'\n    "], ["\n      SELECT id, name, sku, \"stockCount\", \"stockMin\" FROM \"Product\" WHERE \"stockCount\" <= \"stockMin\" AND status = 'ACTIVE'\n    "])))];
                case 3:
                    lowStockParts = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            totalProducts: totalProducts,
                            lowStockCount: typeof lowStockProducts === 'number' ? lowStockProducts : 0,
                            lowStockParts: lowStockParts,
                            totalCustomers: totalCustomers,
                            pendingLeads: totalLeads,
                            activeRepairOrders: activeROs,
                            totalVehicles: totalVehicles,
                            availableVehicles: availableVehicles,
                            znsSentToday: znsToday,
                            recentRepairOrders: repairOrders,
                            recentLeads: recentLeads,
                        })];
                case 4:
                    error_1 = _b.sent();
                    console.error("Dashboard API error:", error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1, templateObject_2;
