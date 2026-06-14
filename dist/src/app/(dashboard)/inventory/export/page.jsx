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
exports.default = ExportPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function ExportPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), movements = _a[0], setMovements = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/inventory/movements?type=EXPORT")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setMovements(data.movements || []);
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
    if (loading) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Xuất kho phụ tùng</h2>
        <p className="text-muted-foreground text-sm mt-1">Lịch sử xuất kho phụ tùng phục vụ cho các lệnh sửa chữa xe dịch vụ</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian xuất</th>
              <th>SKU</th>
              <th>Tên phụ tùng</th>
              <th>Số lượng xuất</th>
              <th>Lệnh sửa chữa (RO)</th>
              <th>Lý do xuất</th>
              <th>Người xuất</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(function (m) {
            var _a, _b, _c;
            return (<tr key={m.id}>
                <td className="text-muted-foreground text-xs">{(0, utils_1.formatDate)(m.createdAt)}</td>
                <td><code className="text-xs font-semibold text-primary">{(_a = m.product) === null || _a === void 0 ? void 0 : _a.sku}</code></td>
                <td className="font-medium">{(_b = m.product) === null || _b === void 0 ? void 0 : _b.name}</td>
                <td className="text-destructive font-semibold">-{m.quantity} {(_c = m.product) === null || _c === void 0 ? void 0 : _c.unit}</td>
                <td>{m.relatedRoId ? <span className="badge badge-primary text-[10px]">RO #{m.relatedRoId}</span> : <span className="text-muted-foreground">—</span>}</td>
                <td>{m.reason || "Lắp đặt sửa chữa"}</td>
                <td className="text-muted-foreground">{m.createdBy}</td>
              </tr>);
        })}
            {movements.length === 0 && (<tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lịch sử xuất kho</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
