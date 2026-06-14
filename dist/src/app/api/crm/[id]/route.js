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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
exports.DELETE = DELETE;
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
// PATCH /api/crm/[id] — update lead/customer details
function PATCH(req_1, _a) {
    return __awaiter(this, arguments, void 0, function (req, _b) {
        var id, body, type, updateData, customer, lead, error_1;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    id = parseInt(params.id);
                    return [4 /*yield*/, req.json()];
                case 1:
                    body = _c.sent();
                    if (!(body.type === "customer")) return [3 /*break*/, 3];
                    type = body.type, updateData = __rest(body, ["type"]);
                    if (updateData.tags && typeof updateData.tags === "string") {
                        updateData.tags = updateData.tags.split(",").map(function (t) { return t.trim(); });
                    }
                    return [4 /*yield*/, prisma_1.prisma.customer.update({
                            where: { id: id },
                            data: updateData,
                        })];
                case 2:
                    customer = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json(customer)];
                case 3: return [4 /*yield*/, prisma_1.prisma.lead.update({
                        where: { id: id },
                        data: body,
                    })];
                case 4:
                    lead = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json(lead)];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_1.message }, { status: 400 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// DELETE /api/crm/[id] — delete lead or customer
function DELETE(req_1, _a) {
    return __awaiter(this, arguments, void 0, function (req, _b) {
        var id, type, error_2;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 9, , 10]);
                    id = parseInt(params.id);
                    type = req.nextUrl.searchParams.get("type");
                    if (!(type === "customer")) return [3 /*break*/, 6];
                    // Cascade delete related records first to prevent foreign key errors (or let schema cascading deal with it)
                    return [4 /*yield*/, prisma_1.prisma.loyaltyTransaction.deleteMany({ where: { customerId: id } })];
                case 1:
                    // Cascade delete related records first to prevent foreign key errors (or let schema cascading deal with it)
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.znsLog.deleteMany({ where: { customerId: id } })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.repairOrder.deleteMany({ where: { customerId: id } })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.vehicle.updateMany({ where: { customerId: id }, data: { customerId: null } })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.customer.delete({ where: { id: id } })];
                case 5:
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: "Xóa Khách hàng thành công" })];
                case 6: return [4 /*yield*/, prisma_1.prisma.lead.delete({ where: { id: id } })];
                case 7:
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: "Xóa Lead thành công" })];
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_2 = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_2.message }, { status: 400 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
