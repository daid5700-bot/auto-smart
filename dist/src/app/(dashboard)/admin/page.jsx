"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboard;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function AdminDashboard() {
    var _a;
    var _b = (0, react_1.useState)(null), data = _b[0], setData = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    (0, react_1.useEffect)(function () {
        fetch("/api/dashboard").then(function (r) { return r.json(); }).then(setData).finally(function () { return setLoading(false); });
    }, []);
    if (loading)
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    if (!data)
        return <p className="text-destructive">Không thể tải dữ liệu. Hãy chắc chắn database đã được seed.</p>;
    var STATS = [
        { title: "Đơn sửa chữa đang xử lý", value: ((_a = data.activeRepairOrders) === null || _a === void 0 ? void 0 : _a.toString()) || "0", icon: lucide_react_1.Wrench, grad: "from-amber-500 to-orange-500", glow: "glow-amber" },
        { title: "Khách hàng", value: (0, utils_1.formatNumber)(data.totalCustomers || 0), icon: lucide_react_1.Users, grad: "from-purple-500 to-pink-500", glow: "" },
        { title: "Lead chờ xử lý", value: (data.pendingLeads || 0).toString(), icon: lucide_react_1.ShoppingCart, grad: "from-emerald-500 to-teal-500", glow: "glow-green" },
        { title: "Xe sẵn sàng bán", value: (data.availableVehicles || 0).toString(), icon: lucide_react_1.Car, grad: "from-blue-500 to-cyan-500", glow: "glow-blue" },
    ];
    return (<div className="space-y-6 stagger">
      <div><h2 className="text-2xl font-bold">Tổng quan hệ thống</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu realtime từ PostgreSQL.</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(function (c, i) {
            var Icon = c.icon;
            return (<div key={i} className={"glass-card rounded-xl p-5 hover:-translate-y-0.5 transition-transform ".concat(c.glow)}>
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-muted-foreground">{c.title}</p><p className="text-2xl font-bold mt-1 animate-count-up">{c.value}</p></div>
              <div className={"w-11 h-11 rounded-xl bg-gradient-to-br ".concat(c.grad, " flex items-center justify-center")}><Icon size={20} className="text-white"/></div>
            </div>
          </div>);
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><lucide_react_1.Wrench size={16} className="text-purple-400"/>Lệnh sửa chữa gần đây</h3>
          <div className="space-y-3">
            {(data.recentRepairOrders || []).map(function (ro) {
            var _a;
            return (<div key={ro.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><lucide_react_1.Wrench size={14} className="text-purple-400"/></div>
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{(_a = ro.customer) === null || _a === void 0 ? void 0 : _a.name}</p><p className="text-xs text-muted-foreground">{ro.plateNumber} • {ro.vehicleModel}</p></div>
                </div>
                <div className="text-right shrink-0 ml-2"><span className={"badge ".concat((0, utils_1.statusBadge)(ro.status))}>{(0, utils_1.statusText)(ro.status)}</span><p className="text-xs text-muted-foreground mt-1">{(0, utils_1.formatCurrency)(Number(ro.totalAmount))}</p></div>
              </div>);
        })}
            {(!data.recentRepairOrders || data.recentRepairOrders.length === 0) && <p className="text-sm text-muted-foreground">Chưa có lệnh sửa chữa nào.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><lucide_react_1.AlertTriangle size={16} className="text-warning"/><h3 className="text-sm font-semibold">Cảnh báo tồn kho</h3></div>
            {(data.lowStockParts || []).length > 0 ? (data.lowStockParts || []).map(function (p) { return (<div key={p.id} className="flex items-center justify-between text-sm mb-1"><span className="text-muted-foreground truncate">{p.name}</span><span className="badge badge-danger">{p.stockCount}/{p.stockMin}</span></div>); }) : <p className="text-xs text-muted-foreground">Không có cảnh báo</p>}
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><lucide_react_1.MessageSquare size={16} className="text-info"/><h3 className="text-sm font-semibold">ZNS hôm nay</h3></div>
            <p className="text-3xl font-bold">{data.znsSentToday || 0}</p><p className="text-xs text-muted-foreground mt-1">tin nhắn đã gửi</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><lucide_react_1.Users size={16} className="text-emerald-400"/>Lead mới nhất</h3>
        <div className="space-y-3">
          {(data.recentLeads || []).map(function (l) {
            var _a;
            return (<div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center text-white text-xs font-bold shrink-0">{(_a = l.name) === null || _a === void 0 ? void 0 : _a.charAt(0)}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{l.name}</p><p className="text-xs text-muted-foreground truncate">{l.interest}</p></div>
              </div>
              <span className={"badge ".concat((0, utils_1.statusBadge)(l.status), " shrink-0 ml-2")}>{(0, utils_1.statusText)(l.status)}</span>
            </div>);
        })}
        </div>
      </div>
    </div>);
}
