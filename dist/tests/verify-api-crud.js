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
var BASE_URL = "http://localhost:3000";
function verifyCrud() {
    return __awaiter(this, void 0, void 0, function () {
        function logPass(msg) {
            successCount++;
            console.log("\u2705 [TH\u00C0NH C\u00D4NG] ".concat(msg));
        }
        function logFail(msg, err) {
            failCount++;
            console.error("\u274C [TH\u1EA4T B\u1EA0I] ".concat(msg));
            console.error("   Error details:", err);
        }
        var successCount, failCount, postRes, postData, createdId, patchRes, delRes, e_1, postRes, postData, createdId, patchRes, delRes, e_2, postRes, postData, createdId, patchRes, delRes, e_3, postRes, postData, createdId, patchRes, delRes, e_4, cRes, cData, customerId, postRes, postData, createdId, patchRes, delRes, e_5, postRes, postData, createdId, patchRes, delRes, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("⚡ BẮT ĐẦU KIỂM TRA CRUD QUA HTTP API CỦA AUTO-SMART DEV SERVER...");
                    successCount = 0;
                    failCount = 0;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: "Khách Hàng Test CRUD API",
                                phone: "0999888777",
                                source: "WEBSITE",
                                interest: "Test Model X",
                                notes: "Ghi chú test CRUD",
                            }),
                        })];
                case 2:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/crm returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 3:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o Lead m\u1EDBi th\u00E0nh c\u00F4ng qua POST /api/crm (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                interest: "Test Model Y",
                                status: "POTENTIAL",
                            }),
                        })];
                case 4:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/crm/".concat(createdId, " returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt Lead th\u00E0nh c\u00F4ng qua PATCH /api/crm/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm/").concat(createdId), {
                            method: "DELETE",
                        })];
                case 5:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/crm/".concat(createdId, " returned status ").concat(delRes.status));
                    logPass("X\u00F3a Lead th\u00E0nh c\u00F4ng qua DELETE /api/crm/[id]");
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _a.sent();
                    logFail("Quy trình CRUD CRM Lead", e_1);
                    return [3 /*break*/, 7];
                case 7:
                    _a.trys.push([7, 12, , 13]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                type: "customer",
                                name: "Khách Hàng VIP Test CRUD",
                                phone: "0988777666",
                                source: "REFERRAL",
                                email: "testcustomer@autosmart.vn",
                                address: "456 Lạc Long Quân, Hà Nội",
                                tags: "VIP, Test",
                            }),
                        })];
                case 8:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/crm (customer) returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 9:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o Kh\u00E1ch h\u00E0ng m\u1EDBi th\u00E0nh c\u00F4ng qua POST /api/crm (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                type: "customer",
                                address: "789 Lạc Long Quân, Hà Nội",
                                tags: "VIP, Active, Test",
                            }),
                        })];
                case 10:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/crm/".concat(createdId, " (customer) returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt Kh\u00E1ch h\u00E0ng th\u00E0nh c\u00F4ng qua PATCH /api/crm/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm/").concat(createdId, "?type=customer"), {
                            method: "DELETE",
                        })];
                case 11:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/crm/".concat(createdId, "?type=customer returned status ").concat(delRes.status));
                    logPass("X\u00F3a Kh\u00E1ch h\u00E0ng th\u00E0nh c\u00F4ng qua DELETE /api/crm/[id]");
                    return [3 /*break*/, 13];
                case 12:
                    e_2 = _a.sent();
                    logFail("Quy trình CRUD Khách hàng", e_2);
                    return [3 /*break*/, 13];
                case 13:
                    _a.trys.push([13, 18, , 19]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/sales"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                vin: "VIN-TEST-CRUD-1234",
                                model: "VinFast VF9",
                                variant: "Plus",
                                color: "Đen",
                                year: 2026,
                                listPrice: 1500000000,
                                floorPrice: 1400000000,
                                status: "AVAILABLE",
                            }),
                        })];
                case 14:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/sales returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 15:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o Xe m\u1EDBi th\u00E0nh c\u00F4ng qua POST /api/sales (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/sales/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                status: "RESERVED",
                            }),
                        })];
                case 16:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/sales/".concat(createdId, " returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt Xe th\u00E0nh c\u00F4ng qua PATCH /api/sales/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/sales/").concat(createdId), {
                            method: "DELETE",
                        })];
                case 17:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/sales/".concat(createdId, " returned status ").concat(delRes.status));
                    logPass("X\u00F3a Xe th\u00E0nh c\u00F4ng qua DELETE /api/sales/[id]");
                    return [3 /*break*/, 19];
                case 18:
                    e_3 = _a.sent();
                    logFail("Quy trình CRUD Xe Bán", e_3);
                    return [3 /*break*/, 19];
                case 19:
                    _a.trys.push([19, 24, , 25]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/technicians"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                code: "KTV-CRUD",
                                name: "Thợ Test CRUD",
                                phone: "0999111222",
                                commissionRate: 15,
                            }),
                        })];
                case 20:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/technicians returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 21:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o KTV m\u1EDBi th\u00E0nh c\u00F4ng qua POST /api/technicians (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/technicians/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                status: "WORKING",
                            }),
                        })];
                case 22:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/technicians/".concat(createdId, " returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt KTV th\u00E0nh c\u00F4ng qua PATCH /api/technicians/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/technicians/").concat(createdId), {
                            method: "DELETE",
                        })];
                case 23:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/technicians/".concat(createdId, " returned status ").concat(delRes.status));
                    logPass("X\u00F3a KTV th\u00E0nh c\u00F4ng qua DELETE /api/technicians/[id]");
                    return [3 /*break*/, 25];
                case 24:
                    e_4 = _a.sent();
                    logFail("Quy trình CRUD Kỹ thuật viên", e_4);
                    return [3 /*break*/, 25];
                case 25:
                    _a.trys.push([25, 32, , 33]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/crm?tab=customers"))];
                case 26:
                    cRes = _a.sent();
                    if (!cRes.ok)
                        throw new Error("GET /api/crm?tab=customers returned status ".concat(cRes.status));
                    return [4 /*yield*/, cRes.json()];
                case 27:
                    cData = _a.sent();
                    if (!cData.customers || cData.customers.length === 0) {
                        throw new Error("Không tìm thấy khách hàng nào trong database để test Workshop CRUD");
                    }
                    customerId = cData.customers[0].id;
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/workshop"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                customerId: customerId,
                                plateNumber: "29A-CRUD.12",
                                vehicleModel: "Mazda CX-5",
                                kmIn: 12000,
                                symptoms: "Lệch lái nhẹ",
                                laborCost: 300000,
                            }),
                        })];
                case 28:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/workshop returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 29:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o L\u1EC7nh s\u1EEDa ch\u1EEFa th\u00E0nh c\u00F4ng qua POST /api/workshop (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/workshop/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                status: "DONE",
                            }),
                        })];
                case 30:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/workshop/".concat(createdId, " returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt L\u1EC7nh s\u1EEDa ch\u1EEFa th\u00E0nh c\u00F4ng qua PATCH /api/workshop/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/workshop/").concat(createdId), {
                            method: "DELETE",
                        })];
                case 31:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/workshop/".concat(createdId, " returned status ").concat(delRes.status));
                    logPass("X\u00F3a L\u1EC7nh s\u1EEDa ch\u1EEFa th\u00E0nh c\u00F4ng qua DELETE /api/workshop/[id]");
                    return [3 /*break*/, 33];
                case 32:
                    e_5 = _a.sent();
                    logFail("Quy trình CRUD Lệnh sửa chữa", e_5);
                    return [3 /*break*/, 33];
                case 33:
                    _a.trys.push([33, 38, , 39]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/users"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: "Nhân Viên Test CRUD API",
                                email: "apicruduser@autosmart.vn",
                                password: "securepassword123",
                                role: "SALES",
                            }),
                        })];
                case 34:
                    postRes = _a.sent();
                    if (!postRes.ok)
                        throw new Error("POST /api/users returned status ".concat(postRes.status));
                    return [4 /*yield*/, postRes.json()];
                case 35:
                    postData = _a.sent();
                    createdId = postData.id;
                    logPass("T\u1EA1o Ng\u01B0\u1EDDi d\u00F9ng m\u1EDBi th\u00E0nh c\u00F4ng qua POST /api/users (ID: ".concat(createdId, ")"));
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/users/").concat(createdId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: "Nhân Viên Test CRUD API (Updated)",
                                role: "WAREHOUSE",
                            }),
                        })];
                case 36:
                    patchRes = _a.sent();
                    if (!patchRes.ok)
                        throw new Error("PATCH /api/users/".concat(createdId, " returned status ").concat(patchRes.status));
                    logPass("C\u1EADp nh\u1EADt Ng\u01B0\u1EDDi d\u00F9ng th\u00E0nh c\u00F4ng qua PATCH /api/users/[id]");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/api/users/").concat(createdId), {
                            method: "DELETE",
                        })];
                case 37:
                    delRes = _a.sent();
                    if (!delRes.ok)
                        throw new Error("DELETE /api/users/".concat(createdId, " returned status ").concat(delRes.status));
                    logPass("X\u00F3a Ng\u01B0\u1EDDi d\u00F9ng th\u00E0nh c\u00F4ng qua DELETE /api/users/[id]");
                    return [3 /*break*/, 39];
                case 38:
                    e_6 = _a.sent();
                    logFail("Quy trình CRUD Người dùng hệ thống", e_6);
                    return [3 /*break*/, 39];
                case 39:
                    console.log("\n\uD83C\uDF89 HO\u00C0N TH\u00C0NH: \u0110\u00E3 ki\u1EC3m tra xong! ".concat(successCount, " Pass, ").concat(failCount, " Fail."));
                    return [2 /*return*/];
            }
        });
    });
}
verifyCrud();
