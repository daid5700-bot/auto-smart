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
exports.default = CustomersPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function CustomersPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), customers = _a[0], setCustomers = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    // Filters state
    var _c = (0, react_1.useState)(""), searchTerm = _c[0], setSearchTerm = _c[1];
    var _d = (0, react_1.useState)("all"), activeTab = _d[0], setActiveTab = _d[1];
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
    if (loading) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    // Filter logic
    var filteredCustomers = customers.filter(function (c) {
        // Search filter
        var matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.vehiclePlates && c.vehiclePlates.some(function (plate) { return plate.toLowerCase().includes(searchTerm.toLowerCase()); }));
        if (!matchesSearch)
            return false;
        // Tab filter
        if (activeTab === "vip") {
            // VIP: totalSpent > 20,000,000 or has VIP tag
            return Number(c.totalSpent) >= 20000000 || (c.tags && c.tags.includes("VIP"));
        }
        if (activeTab === "inactive") {
            // Inactive: lastVisit is more than 3 months ago (90 days)
            if (!c.lastVisit)
                return true;
            var diffTime = Math.abs(new Date().getTime() - new Date(c.lastVisit).getTime());
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 90;
        }
        if (activeTab === "camry") {
            // Has Camry
            return c.vehiclePlates && c.vehiclePlates.some(function (plate) { return plate.toLowerCase().includes("camry") || c.name.toLowerCase().includes("camry"); });
        }
        if (activeTab === "bmw") {
            return c.vehiclePlates && c.vehiclePlates.some(function (plate) { return plate.toLowerCase().includes("bmw"); });
        }
        if (activeTab === "vios") {
            return c.vehiclePlates && c.vehiclePlates.some(function (plate) { return plate.toLowerCase().includes("vios"); });
        }
        return true;
    });
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Danh sách khách hàng</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý tệp khách hàng chính thức sở hữu ô tô hoặc đã sử dụng dịch vụ tại garage</p>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm text-muted-foreground">
          <lucide_react_1.Users size={14}/>
          <span>Tổng số: {filteredCustomers.length} / {customers.length}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <lucide_react_1.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={searchTerm} onChange={function (e) { return setSearchTerm(e.target.value); }} placeholder="Tìm theo họ tên, số điện thoại, biển số xe..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>

        {/* Filter categories tabs */}
        <div className="flex flex-wrap gap-2">
          <button onClick={function () { return setActiveTab("all"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "all" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40")}>
            <lucide_react_1.Filter size={12}/>
            Tất cả khách hàng
          </button>
          <button onClick={function () { return setActiveTab("vip"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "vip" ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" : "bg-card border border-border text-amber-600 dark:text-amber-400 hover:bg-amber-50")}>
            <lucide_react_1.Award size={12}/>
            Khách hàng VIP (Chi tiêu lớn)
          </button>
          <button onClick={function () { return setActiveTab("inactive"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "inactive" ? "bg-destructive text-white" : "bg-card border border-border text-destructive hover:bg-destructive/10")}>
            <lucide_react_1.CalendarClock size={12}/>
            Đã lâu chưa quay lại (&gt; 90 ngày)
          </button>
          <button onClick={function () { return setActiveTab("camry"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "camry" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40")}>
            <lucide_react_1.Car size={12}/>
            Sở hữu Camry
          </button>
          <button onClick={function () { return setActiveTab("bmw"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "bmw" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40")}>
            <lucide_react_1.Car size={12}/>
            Sở hữu BMW
          </button>
          <button onClick={function () { return setActiveTab("vios"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ".concat(activeTab === "vios" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40")}>
            <lucide_react_1.Car size={12}/>
            Sở hữu Vios
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ email</th>
              <th>Biển số xe / Dòng xe</th>
              <th>Lần ghé cuối</th>
              <th>Điểm tích lũy</th>
              <th>Tổng chi tiêu (VND)</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(function (c) {
            var isVip = Number(c.totalSpent) >= 20000000 || (c.tags && c.tags.includes("VIP"));
            return (<tr key={c.id}>
                  <td className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span>{c.name}</span>
                      {isVip && (<span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                          VIP
                        </span>)}
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.email || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.vehiclePlates && c.vehiclePlates.map(function (plate) { return (<span key={plate} className="text-xs bg-secondary/80 px-2 py-0.5 rounded border border-border text-foreground font-mono">
                          {plate}
                        </span>); })}
                      {(!c.vehiclePlates || c.vehiclePlates.length === 0) && <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {c.lastVisit ? (0, utils_1.formatDate)(c.lastVisit) : "Chưa ghé thăm"}
                  </td>
                  <td className="font-bold text-amber-600">{c.loyaltyPoints} điểm</td>
                  <td className="font-bold text-primary">{(0, utils_1.formatCurrency)(Number(c.totalSpent))}</td>
                </tr>);
        })}
            {filteredCustomers.length === 0 && (<tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy khách hàng nào khớp với bộ lọc
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>);
}
