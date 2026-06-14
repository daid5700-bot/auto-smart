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
var prisma_1 = require("../../../../lib/prisma");
function PATCH(req_1, _a) {
    return __awaiter(this, arguments, void 0, function (req, _b) {
        var id, body, data, user, _, safeUser, error_1;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    id = parseInt(params.id);
                    return [4 /*yield*/, req.json()];
                case 1:
                    body = _c.sent();
                    data = {};
                    if (body.name !== undefined)
                        data.name = body.name;
                    if (body.email !== undefined)
                        data.email = body.email;
                    if (body.password !== undefined && body.password !== "")
                        data.password = body.password;
                    if (body.role !== undefined)
                        data.role = body.role;
                    return [4 /*yield*/, prisma_1.prisma.user.update({
                            where: { id: id },
                            data: data,
                        })];
                case 2:
                    user = _c.sent();
                    _ = user.password, safeUser = __rest(user, ["password"]);
                    return [2 /*return*/, server_1.NextResponse.json(safeUser)];
                case 3:
                    error_1 = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_1.message }, { status: 400 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function DELETE(req_1, _a) {
    return __awaiter(this, arguments, void 0, function (req, _b) {
        var id, user, error_2;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 5, , 6]);
                    id = parseInt(params.id);
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({ where: { id: id } })];
                case 1:
                    user = _c.sent();
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })];
                    }
                    if (user.email === "admin@autosmart.vn") {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Không thể xóa tài khoản Quản trị viên tối cao" }, { status: 400 })];
                    }
                    // Safely update associations
                    return [4 /*yield*/, prisma_1.prisma.repairOrder.updateMany({ where: { createdById: id }, data: { createdById: null } })];
                case 2:
                    // Safely update associations
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, prisma_1.prisma.user.delete({ where: { id: id } })];
                case 4:
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: "Xóa người dùng thành công" })];
                case 5:
                    error_2 = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_2.message }, { status: 400 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
