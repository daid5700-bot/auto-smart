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
exports.GET = GET;
exports.POST = POST;
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
// GET /api/crm — leads, customers, zns logs
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var tab, leads, customers, znsLogs, _a, leadCount, customerCount, znsCount, convertedCount, totalLeads;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tab = req.nextUrl.searchParams.get("tab") || "leads";
                    if (!(tab === "leads")) return [3 /*break*/, 2];
                    return [4 /*yield*/, prisma_1.prisma.lead.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true, assignedTo: true } })];
                case 1:
                    leads = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ leads: leads })];
                case 2:
                    if (!(tab === "customers")) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma_1.prisma.customer.findMany({ orderBy: { totalSpent: "desc" } })];
                case 3:
                    customers = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ customers: customers })];
                case 4:
                    if (!(tab === "zns")) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma_1.prisma.znsLog.findMany({ orderBy: { sentAt: "desc" }, include: { customer: true } })];
                case 5:
                    znsLogs = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ znsLogs: znsLogs })];
                case 6: return [4 /*yield*/, Promise.all([
                        prisma_1.prisma.lead.count(),
                        prisma_1.prisma.customer.count(),
                        prisma_1.prisma.znsLog.count(),
                        prisma_1.prisma.lead.count({ where: { status: "CONVERTED" } }),
                        prisma_1.prisma.lead.count(),
                    ])];
                case 7:
                    _a = _b.sent(), leadCount = _a[0], customerCount = _a[1], znsCount = _a[2], convertedCount = _a[3], totalLeads = _a[4];
                    return [2 /*return*/, server_1.NextResponse.json({
                            leadCount: leadCount,
                            customerCount: customerCount,
                            znsCount: znsCount,
                            conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
                        })];
            }
        });
    });
}
// POST /api/crm — create lead or customer
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var body, customer, lead, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, req.json()];
                case 1:
                    body = _a.sent();
                    if (!(body.type === "customer")) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma_1.prisma.customer.create({
                            data: {
                                name: body.name,
                                phone: body.phone,
                                email: body.email || null,
                                address: body.address || null,
                                source: body.source || "WALKIN",
                                tags: body.tags ? (typeof body.tags === "string" ? body.tags.split(",").map(function (t) { return t.trim(); }) : body.tags) : [],
                            }
                        })];
                case 2:
                    customer = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json(customer, { status: 201 })];
                case 3: return [4 /*yield*/, prisma_1.prisma.lead.create({ data: { name: body.name, phone: body.phone, source: body.source || "WALKIN", interest: body.interest, notes: body.notes, assignedToId: body.assignedToId } })];
                case 4:
                    lead = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json(lead, { status: 201 })];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_1.message }, { status: 400 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
