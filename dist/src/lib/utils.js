"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatCurrency = formatCurrency;
exports.formatNumber = formatNumber;
exports.formatDate = formatDate;
exports.normalizePhone = normalizePhone;
exports.statusText = statusText;
exports.statusBadge = statusBadge;
exports.getPriceForCustomer = getPriceForCustomer;
exports.getFinalPrice = getFinalPrice;
exports.checkStockWarning = checkStockWarning;
exports.checkSlowMoving = checkSlowMoving;
exports.calculatePoints = calculatePoints;
exports.redeemPoints = redeemPoints;
exports.calculateNextOilChange = calculateNextOilChange;
var clsx_1 = require("clsx");
var tailwind_merge_1 = require("tailwind-merge");
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(num) {
    return new Intl.NumberFormat("vi-VN").format(num);
}
function formatDate(date) {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}
function normalizePhone(phone) {
    var c = phone.replace(/\D/g, "");
    if (c.startsWith("0"))
        c = "84" + c.substring(1);
    if (!c.startsWith("84"))
        c = "84" + c;
    return c;
}
var STATUS_MAP = {
    ACTIVE: { text: "Hoạt động", badge: "badge-success" },
    INACTIVE: { text: "Ngừng", badge: "badge-danger" },
    PENDING: { text: "Chờ tiếp nhận", badge: "badge-warning" },
    DIAGNOSING: { text: "Chẩn đoán", badge: "badge-info" },
    DOING: { text: "Đang sửa", badge: "badge-purple" },
    WAITING_PARTS: { text: "Chờ phụ tùng", badge: "badge-warning" },
    DONE: { text: "Hoàn thành", badge: "badge-success" },
    DELIVERED: { text: "Đã giao", badge: "badge-success" },
    AVAILABLE: { text: "Sẵn sàng", badge: "badge-success" },
    RESERVED: { text: "Đã đặt", badge: "badge-warning" },
    INCOMING: { text: "Đang về", badge: "badge-info" },
    SOLD: { text: "Đã bán", badge: "badge-purple" },
    NEW: { text: "Mới", badge: "badge-primary" },
    CONSULTING: { text: "Đang tư vấn", badge: "badge-warning" },
    POTENTIAL: { text: "Tiềm năng", badge: "badge-purple" },
    CONVERTED: { text: "Đã mua", badge: "badge-success" },
    LOST: { text: "Mất", badge: "badge-danger" },
    IDLE: { text: "Đang rảnh", badge: "badge-success" },
    WORKING: { text: "Đang làm", badge: "badge-warning" },
    SENT: { text: "Đã gửi", badge: "badge-primary" },
    FAILED: { text: "Thất bại", badge: "badge-danger" },
};
function statusText(s) { var _a, _b; return (_b = (_a = STATUS_MAP[s]) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : s; }
function statusBadge(s) { var _a, _b; return (_b = (_a = STATUS_MAP[s]) === null || _a === void 0 ? void 0 : _a.badge) !== null && _b !== void 0 ? _b : "badge-primary"; }
function getPriceForCustomer(product, customerType) {
    var prices = product.prices || [];
    if (customerType === "Đại lý") {
        var wholesale = prices.find(function (p) { return p.type === "WHOLESALE"; });
        if (wholesale)
            return Number(wholesale.amount);
    }
    var retail = prices.find(function (p) { return p.type === "RETAIL"; });
    return retail ? Number(retail.amount) : 0;
}
function getFinalPrice(product, customerType, overridePrice) {
    if (overridePrice !== undefined && overridePrice !== null) {
        return overridePrice;
    }
    return getPriceForCustomer(product, customerType);
}
function checkStockWarning(product) {
    if (product.stockCount < product.stockMin) {
        return "LOW_STOCK_WARNING";
    }
    return "OK";
}
function checkSlowMoving(product) {
    var referenceDate = product.lastImportDate || product.createdAt || new Date();
    var diffTime = Math.abs(new Date().getTime() - new Date(referenceDate).getTime());
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 90) {
        return "SLOW_MOVING";
    }
    return "OK";
}
function calculatePoints(totalAmount, ratePercent) {
    return Math.floor((totalAmount * ratePercent / 100));
}
function redeemPoints(points, currentBill) {
    var discount = points;
    var finalBill = Math.max(0, currentBill - discount);
    var remainingPoints = 0;
    return { finalBill: finalBill, remainingPoints: remainingPoints };
}
function calculateNextOilChange(lastOilChangeDate, intervalMonths) {
    var nextDate = new Date(lastOilChangeDate);
    nextDate.setMonth(nextDate.getMonth() + intervalMonths);
    return nextDate;
}
