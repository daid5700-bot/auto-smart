"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
function SettingsPage() {
    var _a = (0, react_1.useState)("Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt..."), znsTemplate = _a[0], setZnsTemplate = _a[1];
    var _b = (0, react_1.useState)(7.9), leaseRate = _b[0], setLeaseRate = _b[1];
    var _c = (0, react_1.useState)(1), pointsRate = _c[0], setPointsRate = _c[1];
    var _d = (0, react_1.useState)(false), success = _d[0], setSuccess = _d[1];
    var handleSave = function (e) {
        e.preventDefault();
        setSuccess(true);
        setTimeout(function () { return setSuccess(false); }, 2000);
    };
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Cấu hình Hệ thống</h2>
        <p className="text-muted-foreground text-sm mt-1">Thiết lập các thông số vận hành cho toàn bộ ERP & CRM</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl glass-card rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">1. Cấu hình Zalo ZNS</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mẫu tin nhắn nhắc thay dầu (Template)</label>
            <textarea value={znsTemplate} onChange={function (e) { return setZnsTemplate(e.target.value); }} rows={3} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">2. Cấu hình Kinh doanh xe</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Lãi suất trả góp ngân hàng cơ bản (% / năm)</label>
            <input type="number" step="0.1" value={leaseRate} onChange={function (e) { return setLeaseRate(parseFloat(e.target.value) || 0); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">3. Chương trình khách hàng thân thiết</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tỷ lệ quy đổi điểm (%)</label>
            <input type="number" step="0.1" value={pointsRate} onChange={function (e) { return setPointsRate(parseFloat(e.target.value) || 0); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
            <p className="text-[10px] text-muted-foreground mt-1">Ví dụ: Tỷ lệ 1% có nghĩa thanh toán 10.000.000đ sẽ tích được 100.000đ điểm quy đổi.</p>
          </div>
        </div>

        {success && (<div className="flex items-center gap-2 text-xs font-bold text-success bg-success/10 border border-success/20 p-3 rounded-xl">
            <lucide_react_1.CheckCircle2 size={16}/> Lưu cấu hình hệ thống thành công!
          </div>)}

        <button type="submit" className="px-5 py-2.5 gradient-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 flex items-center gap-2">
          <lucide_react_1.Save size={16}/> Lưu cấu hình
        </button>
      </form>
    </div>);
}
