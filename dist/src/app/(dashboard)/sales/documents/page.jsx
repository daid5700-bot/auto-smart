"use strict";
"use client";
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
exports.default = DocumentsPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
function DocumentsPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), vehicles = _a[0], setVehicles = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/sales")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setVehicles((data.vehicles || []).filter(function (v) { return v.status === "RESERVED" || v.status === "SOLD"; }));
                    return [3 /*break*/, 5];
                case 3:
                    e_1 = _a.sent();
                    console.error(e_1);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        fetchData();
    }, []);
    var handleUpdateDocStatus = function (id, field, val) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, 5, 6]);
                    setLoading(true);
                    return [4 /*yield*/, fetch("/api/sales/".concat(id), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify((_a = {}, _a[field] = val, _a)),
                        })];
                case 1:
                    res = _b.sent();
                    if (!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, fetchData()];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3: return [3 /*break*/, 6];
                case 4:
                    e_2 = _b.sent();
                    console.error(e_2);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading && vehicles.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Thủ tục hồ sơ xe</h2>
        <p className="text-muted-foreground text-sm mt-1">Quản lý tiến độ ngân hàng (trả góp), giải chấp, và thủ tục làm biển số của xe đặt cọc/đã bán</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Số khung (VIN)</th>
              <th>Dòng xe</th>
              <th>Khách hàng mua</th>
              <th>Tiến độ Ngân hàng</th>
              <th>Thủ tục làm biển</th>
              <th>Ghi chú thủ tục</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(function (v) {
            var _a;
            return (<tr key={v.id}>
                <td><code className="text-xs font-bold">{v.vin}</code></td>
                <td className="font-semibold">{v.model} ({v.year})</td>
                <td>{((_a = v.customer) === null || _a === void 0 ? void 0 : _a.name) || "Chưa gán khách"}</td>
                <td>
                  <select value={v.bankStatus || "NONE"} onChange={function (e) { return handleUpdateDocStatus(v.id, "bankStatus", e.target.value); }} className="px-2 py-1 bg-secondary/30 border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none font-medium">
                    <option value="NONE">Mua thẳng (Không vay)</option>
                    <option value="PENDING_APPROVAL">Chờ phê duyệt hồ sơ vay</option>
                    <option value="APPROVED">Đã ra thông báo cho vay</option>
                    <option value="DISBURSED">Đã giải ngân tiền</option>
                  </select>
                </td>
                <td>
                  <select value={v.plateStatus || "PENDING"} onChange={function (e) { return handleUpdateDocStatus(v.id, "plateStatus", e.target.value); }} className="px-2 py-1 bg-secondary/30 border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none font-medium">
                    <option value="PENDING">Chờ nộp thuế</option>
                    <option value="TAX_PAID">Đã nộp thuế trước bạ</option>
                    <option value="PLATE_DONE">Đã bấm biển & bàn giao</option>
                  </select>
                </td>
                <td>
                  <input type="text" defaultValue={v.notes || ""} onBlur={function (e) { return handleUpdateDocStatus(v.id, "notes", e.target.value); }} placeholder="Nhập ghi chú thủ tục..." className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 text-xs outline-none"/>
                </td>
              </tr>);
        })}
            {vehicles.length === 0 && (<tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Không có xe nào đang thực hiện thủ tục (chỉ hiển thị xe đặt cọc hoặc đã bán)</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
