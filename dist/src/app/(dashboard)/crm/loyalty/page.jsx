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
exports.default = LoyaltyPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var actions_1 = require("@/app/actions");
function LoyaltyPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), customers = _a[0], setCustomers = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    // Form State
    var _c = (0, react_1.useState)(""), customerId = _c[0], setCustomerId = _c[1];
    var _d = (0, react_1.useState)(10), pointsToRedeem = _d[0], setPointsToRedeem = _d[1];
    var _e = (0, react_1.useState)(""), successMsg = _e[0], setSuccessMsg = _e[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/crm?tab=customers")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setCustomers(data.customers || []);
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
    var handleRedeem = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var discount, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    setLoading(true);
                    return [4 /*yield*/, (0, actions_1.redeemPointsDb)({
                            customerId: parseInt(customerId),
                            points: pointsToRedeem,
                        })];
                case 2:
                    discount = _a.sent();
                    setSuccessMsg("Quy \u0111\u1ED5i \u0111i\u1EC3m th\u00E0nh c\u00F4ng! Kh\u00E1ch h\u00E0ng \u0111\u01B0\u1EE3c gi\u1EA3m gi\u00E1 ".concat((0, utils_1.formatCurrency)(discount), " tr\u00EAn h\u00F3a \u0111\u01A1n."));
                    setCustomerId("");
                    setPointsToRedeem(10);
                    return [4 /*yield*/, fetchData()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    alert("Lỗi quy đổi điểm: " + err_1.message);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading && customers.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Chương trình Tích điểm Thành viên (Loyalty)</h2>
        <p className="text-muted-foreground text-sm mt-1">Quản lý hạng thành viên, tích điểm dựa trên doanh số thanh toán và khấu trừ hóa đơn dịch vụ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Redeem points form */}
        <div className="glass-card rounded-xl p-6 h-fit space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <lucide_react_1.Gift size={20}/>
            <h3 className="font-bold">Quy đổi điểm thưởng</h3>
          </div>
          <p className="text-xs text-muted-foreground">Tỷ lệ quy đổi: 1 điểm = 1.000đ khấu trừ vào hóa đơn sửa chữa dịch vụ.</p>
          <form onSubmit={handleRedeem} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Chọn khách hàng</label>
              <select required value={customerId} onChange={function (e) { return setCustomerId(e.target.value); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none">
                <option value="">-- Chọn khách hàng --</option>
                {customers.map(function (c) { return (<option key={c.id} value={c.id}>{c.name} (Điểm hiện tại: {c.loyaltyPoints})</option>); })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Số điểm quy đổi</label>
              <input type="number" required min={1} value={pointsToRedeem} onChange={function (e) { return setPointsToRedeem(parseInt(e.target.value) || 1); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none font-semibold text-primary"/>
            </div>
            {successMsg && <p className="text-xs text-success font-semibold bg-success/10 p-2.5 rounded-lg border border-success/20">{successMsg}</p>}
            <button type="submit" className="w-full py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">Tiến hành khấu trừ</button>
          </form>
        </div>

        {/* Right column — List of customers with points */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Điểm tích lũy</th>
                <th>Giá trị quy đổi tối đa</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(function (c) { return (<tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.phone}</td>
                  <td className="font-bold text-amber-600">{c.loyaltyPoints} điểm</td>
                  <td className="font-semibold text-success">{(0, utils_1.formatCurrency)(c.loyaltyPoints * 1000)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
