"use strict";
"use server";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.importStock = importStock;
exports.sellItem = sellItem;
exports.updateROStatus = updateROStatus;
exports.exportStockForRO = exportStockForRO;
exports.sendZNSMock = sendZNSMock;
exports.redeemPointsDb = redeemPointsDb;
exports.sendOilChangeReminderAction = sendOilChangeReminderAction;
var prisma_1 = require("../lib/prisma");
// ===== INVENTORY LOGIC =====
/**
 * Weighted Average Cost (WAC) & Unit Conversion
 */
function importStock(data) {
    return __awaiter(this, void 0, void 0, function () {
        var factor, actualQty, avgCost, product, newStock, updatedProduct;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (data.conversionFactor !== undefined && data.conversionFactor <= 0) {
                        throw new Error("Conversion factor must be greater than 0");
                    }
                    factor = data.conversionFactor || 1;
                    actualQty = data.quantity * factor;
                    avgCost = data.unitCost / factor;
                    return [4 /*yield*/, prisma_1.prisma.product.findUnique({ where: { id: data.productId } })];
                case 1:
                    product = _a.sent();
                    if (!product)
                        throw new Error("Sản phẩm không tồn tại");
                    newStock = product.stockCount + actualQty;
                    return [4 /*yield*/, prisma_1.prisma.product.update({
                            where: { id: data.productId },
                            data: {
                                stockCount: newStock,
                                lastImportDate: new Date(),
                            },
                        })];
                case 2:
                    updatedProduct = _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.stockMovement.create({
                            data: {
                                productId: data.productId,
                                type: "IMPORT",
                                quantity: actualQty,
                                unitCost: avgCost,
                                totalCost: data.unitCost * data.quantity,
                                createdBy: "system",
                            },
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, { success: true, actualQty: actualQty, avgCost: avgCost, updatedProduct: updatedProduct }];
            }
        });
    });
}
/**
 * Deduct stock on retail sale
 */
function sellItem(productId, quantity) {
    return __awaiter(this, void 0, void 0, function () {
        var product, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.product.findUnique({ where: { id: productId } })];
                case 1:
                    product = _a.sent();
                    if (!product)
                        throw new Error("Sản phẩm không tồn tại");
                    if (product.stockCount < quantity)
                        throw new Error("Không đủ hàng tồn kho");
                    return [4 /*yield*/, prisma_1.prisma.product.update({
                            where: { id: productId },
                            data: { stockCount: product.stockCount - quantity },
                        })];
                case 2:
                    updated = _a.sent();
                    return [2 /*return*/, updated];
            }
        });
    });
}
// ===== WORKSHOP LOGIC =====
/**
 * Update RO status & handle commission/loyalty point triggers
 */
function updateROStatus(data) {
    return __awaiter(this, void 0, void 0, function () {
        var ro, isFinalizing, updatedRo, tech, commission, points;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.repairOrder.findUnique({
                        where: { id: data.repairOrderId },
                        include: { customer: true },
                    })];
                case 1:
                    ro = _a.sent();
                    if (!ro)
                        throw new Error("Lệnh sửa chữa không tồn tại");
                    isFinalizing = data.newStatus === "DONE" && ro.status !== "DONE";
                    return [4 /*yield*/, prisma_1.prisma.repairOrder.update({
                            where: { id: data.repairOrderId },
                            data: __assign({ status: data.newStatus }, (isFinalizing ? { completedAt: new Date() } : {})),
                            include: { customer: true, technician: true, items: true },
                        })];
                case 2:
                    updatedRo = _a.sent();
                    if (!(isFinalizing && updatedRo.technicianId)) return [3 /*break*/, 8];
                    tech = updatedRo.technician;
                    if (!tech) return [3 /*break*/, 5];
                    commission = Number(updatedRo.totalAmount) * tech.commissionRate / 100;
                    return [4 /*yield*/, prisma_1.prisma.techPerformance.create({
                            data: {
                                technicianId: tech.id,
                                repairOrderId: updatedRo.id,
                                commissionAmount: commission,
                            },
                        })];
                case 3:
                    _a.sent();
                    // Update tech status back to idle
                    return [4 /*yield*/, prisma_1.prisma.technician.update({
                            where: { id: tech.id },
                            data: { status: "IDLE" },
                        })];
                case 4:
                    // Update tech status back to idle
                    _a.sent();
                    _a.label = 5;
                case 5:
                    points = Math.floor(Number(updatedRo.totalAmount) * 0.01 / 1000);
                    return [4 /*yield*/, prisma_1.prisma.customer.update({
                            where: { id: updatedRo.customerId },
                            data: {
                                loyaltyPoints: { increment: points },
                                totalSpent: { increment: updatedRo.totalAmount },
                                lastVisit: new Date(),
                            },
                        })];
                case 6:
                    _a.sent();
                    // Send ZNS
                    return [4 /*yield*/, prisma_1.prisma.znsLog.create({
                            data: {
                                customerId: updatedRo.customerId,
                                phone: updatedRo.customer.phone,
                                messageType: "THANK_YOU",
                                content: "C\u1EA3m \u01A1n kh\u00E1ch h\u00E0ng ".concat(updatedRo.customer.name, " \u0111\u00E3 s\u1EEDa ch\u1EEFa xe. Qu\u00FD kh\u00E1ch t\u00EDch \u0111\u01B0\u1EE3c +").concat(points, " \u0111i\u1EC3m!"),
                                status: "SENT",
                            },
                        })];
                case 7:
                    // Send ZNS
                    _a.sent();
                    _a.label = 8;
                case 8: return [2 /*return*/, { success: true, ro: updatedRo }];
            }
        });
    });
}
/**
 * Export stock for a Repair Order
 */
function exportStockForRO(data) {
    return __awaiter(this, void 0, void 0, function () {
        var product, selectedPrice, unitPrice, totalPrice, _a, item, roItems, partsCost, ro, laborCost;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.product.findUnique({
                        where: { id: data.productId },
                        include: { prices: true },
                    })];
                case 1:
                    product = _b.sent();
                    if (!product)
                        throw new Error("Sản phẩm không tồn tại");
                    if (product.stockCount < data.quantity) {
                        throw new Error("Không đủ số lượng trong kho");
                    }
                    selectedPrice = product.prices.find(function (p) { return p.type === data.priceType; });
                    if (!selectedPrice)
                        throw new Error("Kh\u00F4ng t\u00ECm th\u1EA5y b\u1EA3ng gi\u00E1 ".concat(data.priceType));
                    unitPrice = Number(selectedPrice.amount);
                    totalPrice = unitPrice * data.quantity;
                    return [4 /*yield*/, prisma_1.prisma.$transaction([
                            prisma_1.prisma.product.update({
                                where: { id: data.productId },
                                data: { stockCount: { decrement: data.quantity } },
                            }),
                            prisma_1.prisma.orderItem.create({
                                data: {
                                    repairOrderId: data.repairOrderId,
                                    productId: data.productId,
                                    quantity: data.quantity,
                                    unitPrice: unitPrice,
                                    totalPrice: totalPrice,
                                },
                            }),
                        ])];
                case 2:
                    _a = _b.sent(), item = _a[1];
                    return [4 /*yield*/, prisma_1.prisma.orderItem.findMany({
                            where: { repairOrderId: data.repairOrderId },
                        })];
                case 3:
                    roItems = _b.sent();
                    partsCost = roItems.reduce(function (acc, curr) { return acc + Number(curr.totalPrice); }, 0);
                    return [4 /*yield*/, prisma_1.prisma.repairOrder.findUnique({ where: { id: data.repairOrderId } })];
                case 4:
                    ro = _b.sent();
                    laborCost = ro ? Number(ro.laborCost) : 0;
                    return [4 /*yield*/, prisma_1.prisma.repairOrder.update({
                            where: { id: data.repairOrderId },
                            data: {
                                partsCost: partsCost,
                                totalAmount: laborCost + partsCost,
                            },
                        })];
                case 5:
                    _b.sent();
                    return [2 /*return*/, { success: true, item: item }];
            }
        });
    });
}
// ===== CRM LOGIC =====
/**
 * Mock ZNS sending
 */
function sendZNSMock(phone, templateId, payload) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Simply mock successful network response returning sent payload
            return [2 /*return*/, {
                    success: true,
                    sentTo: phone,
                    templateId: templateId,
                    payload: payload,
                    sentAt: new Date(),
                }];
        });
    });
}
function redeemPointsDb(data) {
    return __awaiter(this, void 0, void 0, function () {
        var customer, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.customer.findUnique({ where: { id: data.customerId } })];
                case 1:
                    customer = _a.sent();
                    if (!customer)
                        throw new Error("Khách hàng không tồn tại");
                    if (customer.loyaltyPoints < data.points)
                        throw new Error("Không đủ điểm tích lũy");
                    return [4 /*yield*/, prisma_1.prisma.customer.update({
                            where: { id: data.customerId },
                            data: { loyaltyPoints: customer.loyaltyPoints - data.points },
                        })];
                case 2:
                    updated = _a.sent();
                    return [4 /*yield*/, prisma_1.prisma.znsLog.create({
                            data: {
                                customerId: data.customerId,
                                phone: customer.phone,
                                messageType: "PROMO",
                                content: "Kh\u00E1ch h\u00E0ng ".concat(customer.name, " \u0111\u00E3 \u0111\u1ED5i th\u00E0nh c\u00F4ng ").concat(data.points, " \u0111i\u1EC3m t\u00EDch l\u0169y th\u00E0nh gi\u1EA3m gi\u00E1 h\u00F3a \u0111\u01A1n!"),
                                status: "SENT",
                            },
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, data.points * 1000]; // 1 point = 1,000 VND
            }
        });
    });
}
function sendOilChangeReminderAction(data) {
    return __awaiter(this, void 0, void 0, function () {
        var customer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_1.prisma.customer.findUnique({ where: { id: data.customerId } })];
                case 1:
                    customer = _a.sent();
                    if (!customer)
                        throw new Error("Khách hàng không tồn tại");
                    return [4 /*yield*/, prisma_1.prisma.znsLog.create({
                            data: {
                                customerId: data.customerId,
                                phone: data.phone,
                                messageType: "OIL_CHANGE",
                                content: "Nh\u1EAFc l\u1ECBch: Xe ".concat(data.plateNumber, " c\u1EE7a qu\u00FD kh\u00E1ch \u0111\u00E3 \u0111\u1EBFn k\u1EF3 thay d\u1EA7u nh\u1EDBt \u0111\u1ECBnh k\u1EF3. Vui l\u00F2ng li\u00EAn h\u1EC7 AutoSmart \u0111\u1EC3 \u0111\u1EB7t l\u1ECBch h\u1EB9n!"),
                                status: "SENT",
                            },
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}
