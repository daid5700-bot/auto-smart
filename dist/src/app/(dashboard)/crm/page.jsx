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
exports.default = CRMPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var SRC = { FACEBOOK: "Facebook", WEBSITE: "Website", WALKIN: "Vãng lai", REFERRAL: "Giới thiệu" };
var ZNS_TYPE = { THANK_YOU: "Cảm ơn", BIRTHDAY: "Sinh nhật", MAINTENANCE: "Nhắc bảo dưỡng", PROMOTION: "Khuyến mãi" };
var LEAD_COLS = [
    { status: "NEW", label: "Mới", border: "border-t-blue-500/50" },
    { status: "CONSULTING", label: "Đang tư vấn", border: "border-t-amber-500/50" },
    { status: "POTENTIAL", label: "Tiềm năng", border: "border-t-purple-500/50" },
    { status: "CONVERTED", label: "Đã mua", border: "border-t-emerald-500/50" },
];
function CRMPage() {
    var _this = this;
    var _a = (0, react_1.useState)("leads"), tab = _a[0], setTab = _a[1];
    var _b = (0, react_1.useState)(null), stats = _b[0], setStats = _b[1];
    var _c = (0, react_1.useState)(null), tabData = _c[0], setTabData = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    // Modal State
    var _e = (0, react_1.useState)(false), modalOpen = _e[0], setModalOpen = _e[1];
    var _f = (0, react_1.useState)(null), editingId = _f[0], setEditingId = _f[1];
    var _g = (0, react_1.useState)({
        type: "lead", // "lead" | "customer"
        name: "",
        phone: "",
        source: "WALKIN",
        interest: "",
        status: "NEW",
        email: "",
        address: "",
        tags: "",
    }), formData = _g[0], setFormData = _g[1];
    var fetchStats = function () {
        fetch("/api/crm?tab=stats").then(function (r) { return r.json(); }).then(setStats);
    };
    var fetchTabData = function () {
        setLoading(true);
        fetch("/api/crm?tab=".concat(tab))
            .then(function (r) { return r.json(); })
            .then(setTabData)
            .finally(function () { return setLoading(false); });
    };
    (0, react_1.useEffect)(function () { fetchStats(); }, []);
    (0, react_1.useEffect)(function () { fetchTabData(); }, [tab]);
    var handleDeleteLead = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa Lead này?"))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/crm/".concat(id), { method: "DELETE" })];
                case 2:
                    res = _a.sent();
                    if (res.ok) {
                        fetchTabData();
                        fetchStats();
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error(e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleDeleteCustomer = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa Khách hàng này? Việc xóa sẽ giải phóng thông tin xe của họ và dọn dẹp các lịch sử giao dịch liên quan."))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/crm/".concat(id, "?type=customer"), { method: "DELETE" })];
                case 2:
                    res = _a.sent();
                    if (res.ok) {
                        fetchTabData();
                        fetchStats();
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.error(e_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleOpenAdd = function (type) {
        if (type === void 0) { type = "lead"; }
        setEditingId(null);
        setFormData({
            type: type,
            name: "",
            phone: "",
            source: "WALKIN",
            interest: "",
            status: "NEW",
            email: "",
            address: "",
            tags: "",
        });
        setModalOpen(true);
    };
    var handleOpenEdit = function (item, type) {
        setEditingId(item.id);
        setFormData({
            type: type,
            name: item.name,
            phone: item.phone,
            source: item.source,
            interest: item.interest || "",
            status: item.status || "NEW",
            email: item.email || "",
            address: item.address || "",
            tags: item.tags ? item.tags.join(", ") : "",
        });
        setModalOpen(true);
    };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var isCustomer, method, url, payload, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    isCustomer = formData.type === "customer";
                    method = editingId ? "PATCH" : "POST";
                    url = editingId ? "/api/crm/".concat(editingId) : "/api/crm";
                    payload = isCustomer ? {
                        type: "customer",
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email,
                        address: formData.address,
                        source: formData.source,
                        tags: formData.tags,
                    } : {
                        type: "lead",
                        name: formData.name,
                        phone: formData.phone,
                        source: formData.source,
                        interest: formData.interest,
                        status: formData.status,
                    };
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        })];
                case 2:
                    res = _a.sent();
                    if (res.ok) {
                        setModalOpen(false);
                        fetchTabData();
                        fetchStats();
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error(err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Chăm sóc khách hàng</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu realtime từ PostgreSQL</p></div>
        <div className="flex gap-2">
          {tab === "leads" && (<button onClick={function () { return handleOpenAdd("lead"); }} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><lucide_react_1.UserPlus size={16}/>Thêm Lead</button>)}
          {tab === "customers" && (<button onClick={function () { return handleOpenAdd("customer"); }} className="gradient-success text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><lucide_react_1.UserPlus size={16}/>Thêm Khách hàng</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Tổng Lead</p><p className="text-2xl font-bold">{(stats === null || stats === void 0 ? void 0 : stats.leadCount) || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Khách hàng</p><p className="text-2xl font-bold">{(stats === null || stats === void 0 ? void 0 : stats.customerCount) || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">ZNS đã gửi</p><p className="text-2xl font-bold text-info">{(stats === null || stats === void 0 ? void 0 : stats.znsCount) || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Tỉ lệ chuyển đổi</p><p className="text-2xl font-bold text-success">{(stats === null || stats === void 0 ? void 0 : stats.conversionRate) || 0}%</p></div>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        {[["leads", "Lead Pipeline", lucide_react_1.Users], ["customers", "Khách hàng", lucide_react_1.Users], ["zns", "Zalo ZNS", lucide_react_1.MessageSquare]].map(function (_a) {
            var k = _a[0], l = _a[1], I = _a[2];
            return (<button key={k} onClick={function () { return setTab(k); }} className={"px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ".concat(tab === k ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}><I size={14}/>{l}</button>);
        })}
      </div>

      {loading ? <div className="flex items-center justify-center h-32"><lucide_react_1.Loader2 className="w-6 h-6 animate-spin text-primary"/></div> : <>
        {tab === "leads" && (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {LEAD_COLS.map(function (col) {
                    var items = ((tabData === null || tabData === void 0 ? void 0 : tabData.leads) || []).filter(function (l) { return l.status === col.status; });
                    return (<div key={col.status} className={"kanban-column p-3 border-t-2 ".concat(col.border)}>
                  <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-muted-foreground uppercase">{col.label}</h3><span className="badge badge-primary text-[10px]">{items.length}</span></div>
                  <div className="space-y-2">
                    {items.map(function (l) {
                            var _a;
                            return (<div key={l.id} className="kanban-card group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] font-bold">{(_a = l.name) === null || _a === void 0 ? void 0 : _a.charAt(0)}</div>
                            <div className="min-w-0"><p className="text-sm font-medium truncate">{l.name}</p><p className="text-[10px] text-muted-foreground">{l.phone}</p></div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={function () { return handleOpenEdit(l, "lead"); }} className="p-1 text-primary hover:bg-secondary rounded"><lucide_react_1.Edit size={12}/></button>
                            <button onClick={function () { return handleDeleteLead(l.id); }} className="p-1 text-destructive hover:bg-secondary rounded"><lucide_react_1.Trash2 size={12}/></button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{l.interest}</p>
                        <div className="flex items-center justify-between"><span className="badge badge-info text-[10px]">{SRC[l.source] || l.source}</span><span className="text-[10px] text-muted-foreground">{(0, utils_1.formatDate)(l.createdAt)}</span></div>
                      </div>);
                        })}
                    {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 opacity-40">Trống</p>}
                  </div>
                </div>);
                })}
          </div>)}

        {tab === "customers" && (<div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Nguồn</th><th>Biển số</th><th>Chi tiêu</th><th>Điểm</th><th>Lần cuối</th><th className="w-[100px]">Thao tác</th></tr></thead>
            <tbody>{((tabData === null || tabData === void 0 ? void 0 : tabData.customers) || []).map(function (c) {
                    var _a;
                    return (<tr key={c.id}>
                <td><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center text-white text-xs font-bold">{(_a = c.name) === null || _a === void 0 ? void 0 : _a.charAt(0)}</div><div><p className="font-medium">{c.name}</p>{(c.tags || []).map(function (t) { return <span key={t} className="badge badge-warning text-[10px] mr-1">{t}</span>; })}</div></div></td>
                <td>{c.phone}</td><td><span className="badge badge-info text-[10px]">{SRC[c.source] || c.source}</span></td><td className="text-muted-foreground">{(c.vehiclePlates || []).join(", ")}</td>
                <td className="font-semibold">{(0, utils_1.formatCurrency)(Number(c.totalSpent))}</td><td><span className="badge badge-success">{c.loyaltyPoints} pts</span></td><td className="text-muted-foreground">{c.lastVisit ? (0, utils_1.formatDate)(c.lastVisit) : "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={function () { return handleOpenEdit(c, "customer"); }} className="p-1 text-primary hover:bg-secondary rounded" title="Sửa thông tin khách hàng"><lucide_react_1.Edit size={14}/></button>
                    <button onClick={function () { return handleDeleteCustomer(c.id); }} className="p-1 text-destructive hover:bg-secondary rounded" title="Xóa khách hàng"><lucide_react_1.Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>);
                })}</tbody>
          </table></div>)}

        {tab === "zns" && (<div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Loại tin</th><th>Nội dung</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
            <tbody>{((tabData === null || tabData === void 0 ? void 0 : tabData.znsLogs) || []).map(function (z) {
                    var _a;
                    return (<tr key={z.id}>
                <td className="font-medium">{(_a = z.customer) === null || _a === void 0 ? void 0 : _a.name}</td><td>{z.phone}</td>
                <td><span className="badge badge-purple text-[10px]">{ZNS_TYPE[z.messageType] || z.messageType}</span></td>
                <td className="max-w-xs"><p className="text-sm text-muted-foreground truncate">{z.content}</p></td>
                <td><span className={"badge ".concat((0, utils_1.statusBadge)(z.status))}>{(0, utils_1.statusText)(z.status)}</span>{z.error && <p className="text-[10px] text-destructive mt-1">{z.error}</p>}</td>
                <td className="text-muted-foreground text-xs">{(0, utils_1.formatDate)(z.sentAt)}</td>
              </tr>);
                })}</tbody>
          </table></div>)}
      </>}

      {/* Unified CRM Modal */}
      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">
                {editingId
                ? (formData.type === "customer" ? "Cập nhật Khách hàng" : "Cập nhật Lead")
                : (formData.type === "customer" ? "Thêm Khách hàng mới" : "Thêm Lead mới")}
              </h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground"><lucide_react_1.X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên khách hàng</label>
                  <input required value={formData.name} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { name: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Đặng Văn Hùng"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số điện thoại</label>
                  <input required value={formData.phone} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { phone: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 0901234567"/>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nguồn khách hàng</label>
                  <select value={formData.source} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { source: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="FACEBOOK">Facebook</option>
                    <option value="WEBSITE">Website</option>
                    <option value="WALKIN">Vãng lai</option>
                    <option value="REFERRAL">Giới thiệu</option>
                  </select>
                </div>
                
                {formData.type === "lead" ? (<div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái chăm sóc</label>
                    <select value={formData.status} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { status: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="NEW">Mới tiếp nhận (New)</option>
                      <option value="CONSULTING">Đang tư vấn (Consulting)</option>
                      <option value="POTENTIAL">Tiềm năng (Potential)</option>
                      <option value="CONVERTED">Đã chốt mua (Converted)</option>
                    </select>
                  </div>) : (<div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email</label>
                    <input type="email" value={formData.email} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { email: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: mail@example.com"/>
                  </div>)}
              </div>

              {formData.type === "lead" ? (<div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nhu cầu quan tâm</label>
                  <textarea required value={formData.interest} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { interest: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="VD: Quan tâm Toyota Camry 2.5Q 2026, cần tư vấn trả góp..."/>
                </div>) : (<>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                    <input value={formData.address} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { address: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phân loại / Tags (Phân tách bằng dấu phẩy)</label>
                    <input value={formData.tags} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { tags: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: VIP, Thân thiết, Gara"/>
                  </div>
                </>)}

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={function () { return setModalOpen(false); }} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
