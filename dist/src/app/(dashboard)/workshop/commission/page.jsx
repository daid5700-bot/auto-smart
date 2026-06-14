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
exports.default = CommissionPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function CommissionPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), performances = _a[0], setPerformances = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/technicians")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    // Let's call a custom endpoint or fetch technician performances from existing seed
                    // For simplicity, we can fetch all technicians and list their accumulated performances,
                    // or fetch the tech performance transactions.
                    // Let's fetch the list of technicians and show their accumulated totals.
                    setPerformances(data.technicians || []);
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
        <h2 className="text-2xl font-bold">Doanh số & Hoa hồng Kỹ thuật viên</h2>
        <p className="text-muted-foreground text-sm mt-1">Bảng tổng hợp doanh số sửa chữa thực hiện và số hoa hồng KTV tích lũy được</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {performances.map(function (tech) { return (<div key={tech.id} className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">{tech.code}</p>
                <h3 className="text-lg font-bold">{tech.name}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">{tech.name.charAt(0)}</div>
            </div>
            <div className="border-t border-border/40 pt-3 flex justify-between">
              <span className="text-xs text-muted-foreground">Tỷ lệ hoa hồng</span>
              <span className="text-xs font-bold">{tech.commissionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Lệnh hoàn thành</span>
              <span className="text-xs font-bold">{tech.completedOrders} lệnh</span>
            </div>
            <div className="border-t border-border/40 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Tích lũy hoa hồng</span>
              <span className="text-lg font-black text-primary">{(0, utils_1.formatCurrency)(tech.totalCommission)}</span>
            </div>
          </div>); })}
      </div>
    </div>);
}
