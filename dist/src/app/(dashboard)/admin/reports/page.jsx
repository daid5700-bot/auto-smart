"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportsPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function ReportsPage() {
    var _a = (0, react_1.useState)({
        revenue: 124500000,
        orders: 48,
        activeKtv: 5,
        convertedLeads: 12,
    }), stats = _a[0], setStats = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () { return setLoading(false); }, 500);
        return function () { return clearTimeout(timer); };
    }, []);
    if (loading) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Báo cáo & Phân tích ERP</h2>
        <p className="text-muted-foreground text-sm mt-1">Báo cáo doanh số bán xe, doanh thu sửa chữa dịch vụ xưởng, và hiệu suất chăm sóc khách hàng</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground"><span className="text-xs font-semibold uppercase">Doanh thu xưởng dịch vụ</span><lucide_react_1.DollarSign size={18} className="text-primary"/></div>
          <p className="text-2xl font-black">{(0, utils_1.formatCurrency)(stats.revenue)}</p>
          <div className="text-[10px] text-success font-semibold flex items-center gap-1"><lucide_react_1.TrendingUp size={10}/> +12% so với tháng trước</div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground"><span className="text-xs font-semibold uppercase">Lệnh sửa chữa hoàn thành</span><lucide_react_1.BarChart3 size={18} className="text-primary"/></div>
          <p className="text-2xl font-black">{stats.orders} lệnh</p>
          <div className="text-[10px] text-success font-semibold flex items-center gap-1"><lucide_react_1.TrendingUp size={10}/> +8% so với tháng trước</div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground"><span className="text-xs font-semibold uppercase">Kỹ thuật viên hoạt động</span><lucide_react_1.Users size={18} className="text-primary"/></div>
          <p className="text-2xl font-black">{stats.activeKtv} KTV</p>
          <div className="text-[10px] text-muted-foreground font-semibold">100% công suất</div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground"><span className="text-xs font-semibold uppercase">Khách hàng mới (Leads)</span><lucide_react_1.Users size={18} className="text-primary"/></div>
          <p className="text-2xl font-black">{stats.convertedLeads} leads</p>
          <div className="text-[10px] text-success font-semibold flex items-center gap-1"><lucide_react_1.TrendingUp size={10}/> Tỷ lệ chuyển đổi: 45%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-bold">Biểu đồ doanh thu 6 tháng gần nhất</h3>
          <div className="h-64 flex items-end gap-3 pt-6 border-b border-border">
            {[
            { m: "Tháng 1", v: 45 },
            { m: "Tháng 2", v: 60 },
            { m: "Tháng 3", v: 80 },
            { m: "Tháng 4", v: 75 },
            { m: "Tháng 5", v: 95 },
            { m: "Tháng 6", v: 120 },
        ].map(function (d, i) { return (<div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div style={{ height: "".concat(d.v * 1.5, "px") }} className="w-full bg-gradient-to-t from-primary to-cyan-500 rounded-t-lg glow-blue hover:opacity-95 transition-all"/>
                <span className="text-[10px] font-semibold text-muted-foreground mt-2">{d.m}</span>
              </div>); })}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-bold">Doanh số phụ tùng chạy nhất</h3>
          <div className="space-y-4">
            {[
            { name: "Dầu nhớt Castrol Power1 10W-40", qty: 120, revenue: 18000000 },
            { name: "Má phanh trước Toyota Vios", qty: 45, revenue: 27000000 },
            { name: "Lọc dầu động cơ Hyundai Grand i10", qty: 85, revenue: 12750000 },
            { name: "Bóng đèn Halogen H7", qty: 30, revenue: 4500000 },
        ].map(function (item, idx) { return (<div key={idx} className="flex items-center justify-between border-b border-border/40 pb-2">
                <div>
                  <h4 className="text-xs font-bold">{item.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Số lượng bán: {item.qty} đơn vị</p>
                </div>
                <span className="text-xs font-bold text-primary">{(0, utils_1.formatCurrency)(item.revenue)}</span>
              </div>); })}
          </div>
        </div>
      </div>
    </div>);
}
