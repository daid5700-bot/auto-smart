"use strict";
"use client";
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
exports.default = RemindersPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var actions_1 = require("@/app/actions");
function RemindersPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), customers = _a[0], setCustomers = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)({}), sentMap = _c[0], setSentMap = _c[1];
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
    var handleSendReminder = function (c, nextDate) { return __awaiter(_this, void 0, void 0, function () {
        var plate, res, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    plate = c.vehiclePlates[0] || "xe của quý khách";
                    return [4 /*yield*/, (0, actions_1.sendOilChangeReminderAction)({
                            customerId: c.id,
                            phone: c.phone,
                            plateNumber: plate,
                        })];
                case 1:
                    res = _a.sent();
                    if (res.success) {
                        setSentMap(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[c.id] = true, _a)));
                        });
                    }
                    return [3 /*break*/, 4];
                case 2:
                    e_2 = _a.sent();
                    console.error(e_2);
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    if (loading && customers.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Nhắc lịch bảo dưỡng & Thay dầu</h2>
        <p className="text-muted-foreground text-sm mt-1">Danh sách khách hàng sắp đến hoặc đã quá hạn thay dầu nhớt (định kỳ 6 tháng từ lần ghé thăm gần nhất)</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Biển số xe</th>
              <th>Lần ghé gần nhất</th>
              <th>Ngày đến hạn thay dầu</th>
              <th>Tình trạng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(function (c) {
            var baseDate = c.lastVisit ? new Date(c.lastVisit) : new Date(c.createdAt);
            var nextOilChange = new Date(baseDate);
            nextOilChange.setMonth(nextOilChange.getMonth() + 6);
            var isOverdue = nextOilChange < new Date();
            return (<tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>
                    {c.vehiclePlates.map(function (p, idx) { return (<span key={idx} className="badge badge-primary text-[10px] mr-1">{p}</span>); })}
                    {c.vehiclePlates.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td>{c.lastVisit ? (0, utils_1.formatDate)(c.lastVisit) : "Chưa có lượt sửa"}</td>
                  <td className="font-semibold">{(0, utils_1.formatDate)(nextOilChange.toISOString())}</td>
                  <td>
                    <span className={"badge ".concat(isOverdue ? "badge-danger" : "badge-success")}>
                      {isOverdue ? "Quá hạn thay dầu" : "Sắp đến hạn"}
                    </span>
                  </td>
                  <td>
                    {sentMap[c.id] ? (<span className="text-xs text-success font-semibold flex items-center gap-1"><lucide_react_1.CheckCircle2 size={12}/> Đã gửi nhắc lịch</span>) : (<button onClick={function () { return handleSendReminder(c, nextOilChange); }} className="px-3 py-1.5 gradient-primary text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-90">
                        <lucide_react_1.Send size={12}/> Gửi tin ZNS
                      </button>)}
                  </td>
                </tr>);
        })}
          </tbody>
        </table>
      </div>
    </div>);
}
