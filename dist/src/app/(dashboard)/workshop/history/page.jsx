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
exports.default = HistoryPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function HistoryPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), orders = _a[0], setOrders = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(""), search = _c[0], setSearch = _c[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/workshop")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setOrders(data.repairOrders || []);
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
    var filteredOrders = orders.filter(function (o) {
        var _a, _b;
        return o.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
            ((_a = o.vehicleModel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase())) ||
            ((_b = o.customer) === null || _b === void 0 ? void 0 : _b.name.toLowerCase().includes(search.toLowerCase()));
    });
    if (loading) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Lịch sử sửa chữa xe</h2>
        <p className="text-muted-foreground text-sm mt-1">Tra cứu toàn bộ lịch sử sửa chữa, bảo dưỡng của xe dịch vụ tại xưởng</p>
      </div>

      <div className="relative w-full max-w-md">
        <lucide_react_1.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Tìm kiếm biển số, dòng xe, tên khách..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Biển số xe</th>
              <th>Dòng xe</th>
              <th>Khách hàng</th>
              <th>KTV đảm nhận</th>
              <th>Số KM</th>
              <th>Tiền công</th>
              <th>Phụ tùng</th>
              <th>Tổng chi phí</th>
              <th>Trạng thái</th>
              <th>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(function (o) {
            var _a, _b, _c;
            return (<tr key={o.id}>
                <td><span className="font-bold text-primary">{o.plateNumber}</span></td>
                <td className="font-semibold">{o.vehicleModel || "—"}</td>
                <td>
                  <div>
                    <p className="font-medium">{(_a = o.customer) === null || _a === void 0 ? void 0 : _a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(_b = o.customer) === null || _b === void 0 ? void 0 : _b.phone}</p>
                  </div>
                </td>
                <td>{((_c = o.technician) === null || _c === void 0 ? void 0 : _c.name) || "Chưa giao việc"}</td>
                <td>{o.kmIn.toLocaleString()} km</td>
                <td>{(0, utils_1.formatCurrency)(Number(o.laborCost))}</td>
                <td>{(0, utils_1.formatCurrency)(Number(o.partsCost))}</td>
                <td className="font-bold text-primary">{(0, utils_1.formatCurrency)(Number(o.totalAmount))}</td>
                <td>
                  <span className={"badge ".concat((0, utils_1.statusBadge)(o.status))}>
                    {(0, utils_1.statusText)(o.status)}
                  </span>
                </td>
                <td className="text-muted-foreground text-xs">{(0, utils_1.formatDate)(o.updatedAt)}</td>
              </tr>);
        })}
            {filteredOrders.length === 0 && (<tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">Không tìm thấy lịch sử phù hợp</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
