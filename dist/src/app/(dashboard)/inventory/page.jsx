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
exports.default = InventoryPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function InventoryPage() {
    var _this = this;
    var _a = (0, react_1.useState)(null), data = _a[0], setData = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(""), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)(""), catFilter = _d[0], setCatFilter = _d[1];
    // Modal State
    var _e = (0, react_1.useState)(false), modalOpen = _e[0], setModalOpen = _e[1];
    var _f = (0, react_1.useState)(null), editingId = _f[0], setEditingId = _f[1];
    var _g = (0, react_1.useState)({
        sku: "",
        name: "",
        category: "",
        unit: "",
        stockCount: 0,
        stockMin: 0,
        stockMax: 100,
        retailPrice: 0,
        wholesalePrice: 0,
        insurancePrice: 0,
        parentId: "",
    }), formData = _g[0], setFormData = _g[1];
    var fetchData = function () {
        var params = new URLSearchParams();
        if (search)
            params.set("search", search);
        if (catFilter)
            params.set("category", catFilter);
        fetch("/api/inventory?".concat(params))
            .then(function (r) { return r.json(); })
            .then(setData)
            .finally(function () { return setLoading(false); });
    };
    (0, react_1.useEffect)(function () {
        fetchData();
    }, [search, catFilter]);
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa phụ tùng này?"))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/inventory/".concat(id), { method: "DELETE" })];
                case 2:
                    res = _a.sent();
                    if (res.ok) {
                        fetchData();
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
    var handleOpenAdd = function () {
        setEditingId(null);
        setFormData({
            sku: "",
            name: "",
            category: "Lọc",
            unit: "Cái",
            stockCount: 0,
            stockMin: 5,
            stockMax: 100,
            retailPrice: 0,
            wholesalePrice: 0,
            insurancePrice: 0,
            parentId: "",
        });
        setModalOpen(true);
    };
    var handleOpenEdit = function (p) {
        var _a, _b, _c, _d, _e, _f, _g;
        setEditingId(p.id);
        var retail = ((_b = (_a = p.prices) === null || _a === void 0 ? void 0 : _a.find(function (pr) { return pr.type === "RETAIL"; })) === null || _b === void 0 ? void 0 : _b.amount) || 0;
        var wholesale = ((_d = (_c = p.prices) === null || _c === void 0 ? void 0 : _c.find(function (pr) { return pr.type === "WHOLESALE"; })) === null || _d === void 0 ? void 0 : _d.amount) || 0;
        var insurance = ((_f = (_e = p.prices) === null || _e === void 0 ? void 0 : _e.find(function (pr) { return pr.type === "INSURANCE"; })) === null || _f === void 0 ? void 0 : _f.amount) || 0;
        setFormData({
            sku: p.sku,
            name: p.name,
            category: p.category,
            unit: p.unit,
            stockCount: p.stockCount,
            stockMin: p.stockMin,
            stockMax: p.stockMax,
            retailPrice: Number(retail),
            wholesalePrice: Number(wholesale),
            insurancePrice: Number(insurance),
            parentId: ((_g = p.parentId) === null || _g === void 0 ? void 0 : _g.toString()) || "",
        });
        setModalOpen(true);
    };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var method, url, payload, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    method = editingId ? "PATCH" : "POST";
                    url = editingId ? "/api/inventory/".concat(editingId) : "/api/inventory";
                    payload = {
                        sku: formData.sku,
                        name: formData.name,
                        category: formData.category,
                        unit: formData.unit,
                        stockCount: Number(formData.stockCount),
                        stockMin: Number(formData.stockMin),
                        stockMax: Number(formData.stockMax),
                        parentId: formData.parentId ? parseInt(formData.parentId) : null,
                        prices: [
                            { type: "RETAIL", amount: Number(formData.retailPrice) },
                            { type: "WHOLESALE", amount: Number(formData.wholesalePrice) },
                            { type: "INSURANCE", amount: Number(formData.insurancePrice) },
                        ],
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
                        fetchData();
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
    if (loading)
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    var products = (data === null || data === void 0 ? void 0 : data.products) || [];
    var categories = (data === null || data === void 0 ? void 0 : data.categories) || [];
    var lowStock = (data === null || data === void 0 ? void 0 : data.lowStock) || [];
    var totalValue = (data === null || data === void 0 ? void 0 : data.totalValue) || 0;
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Danh mục phụ tùng</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu từ PostgreSQL — Quản lý kho, bảng giá, đơn vị quy đổi</p></div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><lucide_react_1.Plus size={16}/>Thêm phụ tùng</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><lucide_react_1.Package size={14}/><span className="text-xs">Tổng mặt hàng</span></div><p className="text-2xl font-bold">{(data === null || data === void 0 ? void 0 : data.totalCount) || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><lucide_react_1.TrendingUp size={14}/><span className="text-xs">Giá trị tồn kho</span></div><p className="text-2xl font-bold text-primary">{(0, utils_1.formatCurrency)(totalValue)}</p></div>
        <div className="glass-card rounded-xl p-4 glow-amber"><div className="flex items-center gap-2 text-warning mb-1"><lucide_react_1.AlertTriangle size={14}/><span className="text-xs">Sắp hết hàng</span></div><p className="text-2xl font-bold text-warning">{lowStock.length}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><lucide_react_1.TrendingDown size={14}/><span className="text-xs">Tồn cao</span></div><p className="text-2xl font-bold">{products.filter(function (p) { return p.stockCount >= p.stockMax; }).length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><lucide_react_1.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Tìm theo tên hoặc mã SKU..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <select value={catFilter} onChange={function (e) { return setCatFilter(e.target.value); }} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none"><option value="">Tất cả nhóm</option>{categories.map(function (c) { return <option key={c} value={c}>{c}</option>; })}</select>
      </div>

      {lowStock.length > 0 && (<div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <lucide_react_1.AlertTriangle size={18} className="text-warning shrink-0 mt-0.5"/>
          <div><p className="text-sm font-semibold text-warning">Cảnh báo tồn kho thấp!</p><p className="text-xs text-muted-foreground mt-1">{lowStock.map(function (p) { return "".concat(p.name, " (").concat(p.stockCount, "/").concat(p.stockMin, ")"); }).join(", ")}</p></div>
        </div>)}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead><tr><th>Mã SKU</th><th>Tên phụ tùng</th><th>Nhóm</th><th>ĐVT</th><th>Tồn kho</th><th>Giá Lẻ</th><th>Giá Sỉ</th><th>Giá BH</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {products.map(function (p) {
            var _a, _b, _c;
            var retail = (_a = p.prices) === null || _a === void 0 ? void 0 : _a.find(function (pr) { return pr.type === "RETAIL"; });
            var wholesale = (_b = p.prices) === null || _b === void 0 ? void 0 : _b.find(function (pr) { return pr.type === "WHOLESALE"; });
            var insurance = (_c = p.prices) === null || _c === void 0 ? void 0 : _c.find(function (pr) { return pr.type === "INSURANCE"; });
            var isSlowMoving = (0, utils_1.checkSlowMoving)(p) === "SLOW_MOVING";
            return (<tr key={p.id}>
                  <td><div className="flex items-center gap-1">{p.parentId && <lucide_react_1.ChevronRight size={12} className="text-muted-foreground"/>}<code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">{p.sku}</code></div></td>
                  <td className="font-medium">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{p.name}</span>
                      {isSlowMoving && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-medium px-1.5 py-0.2 rounded border border-amber-200/50">Tồn lâu ngày</span>}
                    </div>
                  </td>
                  <td><span className="badge badge-primary">{p.category}</span></td>
                  <td className="text-muted-foreground">{p.unit}{p.conversionUnit && <span className="text-xs block">1 {p.conversionUnit} = {p.conversionFactor} {p.unit}</span>}</td>
                  <td><span className={"font-semibold ".concat(p.stockCount <= p.stockMin ? "text-destructive" : "")}>{(0, utils_1.formatNumber)(p.stockCount)}</span><span className="text-xs text-muted-foreground ml-1">/{p.stockMin}-{p.stockMax}</span></td>
                  <td>{retail ? (0, utils_1.formatCurrency)(Number(retail.amount)) : "—"}</td>
                  <td>{wholesale ? (0, utils_1.formatCurrency)(Number(wholesale.amount)) : "—"}</td>
                  <td>{insurance ? (0, utils_1.formatCurrency)(Number(insurance.amount)) : "—"}</td>
                  <td><span className={"badge ".concat((0, utils_1.statusBadge)(p.status))}>{(0, utils_1.statusText)(p.status)}</span></td>
                  <td><div className="flex items-center gap-1"><button onClick={function () { return handleOpenEdit(p); }} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-primary"><lucide_react_1.Edit size={14}/></button><button onClick={function () { return handleDelete(p.id); }} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-destructive"><lucide_react_1.Trash2 size={14}/></button></div></td>
                </tr>);
        })}
          </tbody>
        </table></div>
      </div>

      {/* CRUD Modal */}
      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật phụ tùng" : "Thêm phụ tùng mới"}</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground"><lucide_react_1.X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã SKU</label>
                  <input required value={formData.sku} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { sku: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: LG-001"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên phụ tùng</label>
                  <input required value={formData.name} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { name: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Lọc gió điều hòa"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nhóm hàng</label>
                  <input required value={formData.category} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { category: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Lọc"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Đơn vị tính</label>
                  <input required value={formData.unit} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { unit: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Cái"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã sản phẩm cha (Mã hàng đa tầng)</label>
                <select value={formData.parentId} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { parentId: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="">-- Không có (Sản phẩm gốc) --</option>
                  {products.filter(function (p) { return !p.parentId && p.id !== editingId; }).map(function (p) { return (<option key={p.id} value={p.id}>{p.sku} - {p.name}</option>); })}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số lượng tồn</label>
                  <input type="number" required value={formData.stockCount} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { stockCount: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Min an toàn</label>
                  <input type="number" required value={formData.stockMin} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { stockMin: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Max an toàn</label>
                  <input type="number" required value={formData.stockMax} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { stockMax: parseInt(e.target.value) || 100 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/40">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá bán lẻ</label>
                  <input type="number" required value={formData.retailPrice} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { retailPrice: parseInt(e.target.value) || 0 })); }} className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá bán sỉ</label>
                  <input type="number" required value={formData.wholesalePrice} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { wholesalePrice: parseInt(e.target.value) || 0 })); }} className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá Bảo hiểm</label>
                  <input type="number" required value={formData.insurancePrice} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { insurancePrice: parseInt(e.target.value) || 0 })); }} className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={function () { return setModalOpen(false); }} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
