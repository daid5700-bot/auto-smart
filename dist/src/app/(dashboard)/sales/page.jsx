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
exports.default = SalesPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var COLOR_DOT = { "Đen": "bg-gray-800", "Trắng": "bg-white border border-border", "Bạc": "bg-gray-400", "Đỏ": "bg-red-500", "Xanh": "bg-blue-500" };
function SalesPage() {
    var _this = this;
    var _a = (0, react_1.useState)(null), data = _a[0], setData = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(""), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)(""), statusF = _d[0], setStatusF = _d[1];
    var _e = (0, react_1.useState)("grid"), view = _e[0], setView = _e[1];
    // Modal State
    var _f = (0, react_1.useState)(false), modalOpen = _f[0], setModalOpen = _f[1];
    var _g = (0, react_1.useState)(null), editingId = _g[0], setEditingId = _g[1];
    var _h = (0, react_1.useState)({
        vin: "",
        model: "",
        variant: "",
        color: "Đen",
        year: 2026,
        listPrice: 0,
        floorPrice: 0,
        status: "AVAILABLE",
    }), formData = _h[0], setFormData = _h[1];
    var fetchData = function () {
        var params = new URLSearchParams();
        if (search)
            params.set("search", search);
        if (statusF)
            params.set("status", statusF);
        fetch("/api/sales?".concat(params))
            .then(function (r) { return r.json(); })
            .then(setData)
            .finally(function () { return setLoading(false); });
    };
    (0, react_1.useEffect)(function () {
        fetchData();
    }, [search, statusF]);
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa xe này?"))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/sales/".concat(id), { method: "DELETE" })];
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
            vin: "",
            model: "",
            variant: "",
            color: "Đen",
            year: 2026,
            listPrice: 0,
            floorPrice: 0,
            status: "AVAILABLE",
        });
        setModalOpen(true);
    };
    var handleOpenEdit = function (v) {
        setEditingId(v.id);
        setFormData({
            vin: v.vin,
            model: v.model,
            variant: v.variant,
            color: v.color,
            year: v.year,
            listPrice: Number(v.listPrice),
            floorPrice: Number(v.floorPrice),
            status: v.status,
        });
        setModalOpen(true);
    };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var method, url, res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    method = editingId ? "PATCH" : "POST";
                    url = editingId ? "/api/sales/".concat(editingId) : "/api/sales";
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(formData),
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
    var vehicles = (data === null || data === void 0 ? void 0 : data.vehicles) || [];
    var counts = (data === null || data === void 0 ? void 0 : data.counts) || {};
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Kho xe</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu realtime từ PostgreSQL</p></div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"><lucide_react_1.Plus size={16}/>Thêm xe mới</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["AVAILABLE", "RESERVED", "INCOMING", "SOLD"].map(function (s) { return (<div key={s} className="glass-card rounded-xl p-4 hover:-translate-y-0.5 transition-transform cursor-pointer" onClick={function () { return setStatusF(statusF === s ? "" : s); }}>
            <p className="text-xs text-muted-foreground">{(0, utils_1.statusText)(s)}</p>
            <p className="text-2xl font-bold mt-1">{counts[s] || 0}</p>
          </div>); })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><lucide_react_1.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={function (e) { return setSearch(e.target.value); }} placeholder="Tìm theo model hoặc VIN..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <div className="flex bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={function () { return setView("grid"); }} className={"px-3 py-2 text-xs ".concat(view === "grid" ? "bg-primary text-white" : "")}><lucide_react_1.Grid3X3 size={14}/></button>
          <button onClick={function () { return setView("list"); }} className={"px-3 py-2 text-xs ".concat(view === "list" ? "bg-primary text-white" : "")}><lucide_react_1.List size={14}/></button>
        </div>
      </div>

      {view === "grid" ? (<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(function (v) {
                var _a;
                return (<div key={v.id} className="glass-card rounded-xl overflow-hidden hover:-translate-y-1 transition-transform group">
              <div className="h-40 bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center relative">
                <lucide_react_1.Car size={64} className="text-muted-foreground/20"/>
                <span className={"badge ".concat((0, utils_1.statusBadge)(v.status), " absolute top-3 right-3")}>{(0, utils_1.statusText)(v.status)}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold">{v.model}</h3>
                <p className="text-sm text-muted-foreground">{v.variant} • {v.year}</p>
                <div className="flex items-center gap-2 mt-2"><div className={"w-4 h-4 rounded-full ".concat(COLOR_DOT[v.color] || "bg-gray-500")}/><span className="text-xs text-muted-foreground">{v.color}</span></div>
                <div className="mt-4 pt-3 border-t border-border/30">
                  <p className="text-lg font-bold text-primary">{(0, utils_1.formatCurrency)(Number(v.listPrice))}</p>
                  <p className="text-[10px] text-muted-foreground">Floor: {(0, utils_1.formatCurrency)(Number(v.floorPrice))}</p>
                </div>
                <code className="text-[10px] bg-secondary/50 px-2 py-1 rounded mt-2 inline-block">VIN: {(_a = v.vin) === null || _a === void 0 ? void 0 : _a.slice(-8)}</code>
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={function () { return handleOpenEdit(v); }} className="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 flex items-center justify-center gap-1"><lucide_react_1.Edit size={12}/>Sửa</button>
                  <button onClick={function () { return handleDelete(v.id); }} className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 flex items-center justify-center gap-1"><lucide_react_1.Trash2 size={12}/>Xóa</button>
                </div>
              </div>
            </div>);
            })}
        </div>) : (<div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
          <thead><tr><th>VIN</th><th>Model</th><th>Phiên bản</th><th>Màu</th><th>Năm</th><th>Giá niêm yết</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{vehicles.map(function (v) {
                var _a;
                return (<tr key={v.id}>
              <td><code className="text-xs">{(_a = v.vin) === null || _a === void 0 ? void 0 : _a.slice(-8)}</code></td>
              <td className="font-medium">{v.model}</td>
              <td>{v.variant}</td>
              <td><div className="flex items-center gap-2"><div className={"w-3 h-3 rounded-full ".concat(COLOR_DOT[v.color] || "bg-gray-500")}/>{v.color}</div></td>
              <td>{v.year}</td>
              <td className="font-semibold">{(0, utils_1.formatCurrency)(Number(v.listPrice))}</td>
              <td><span className={"badge ".concat((0, utils_1.statusBadge)(v.status))}>{(0, utils_1.statusText)(v.status)}</span></td>
              <td>
                <div className="flex items-center gap-2">
                  <button onClick={function () { return handleOpenEdit(v); }} className="p-1 hover:bg-secondary rounded text-primary"><lucide_react_1.Edit size={14}/></button>
                  <button onClick={function () { return handleDelete(v.id); }} className="p-1 hover:bg-secondary rounded text-destructive"><lucide_react_1.Trash2 size={14}/></button>
                </div>
              </td>
            </tr>);
            })}</tbody>
        </table></div>)}

      {/* CRUD Modal */}
      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật thông tin xe" : "Thêm xe mới"}</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground"><lucide_react_1.X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số khung (VIN)</label>
                  <input required value={formData.vin} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { vin: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: JTDKN3DU5..."/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Dòng xe (Model)</label>
                  <input required value={formData.model} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { model: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Toyota Camry"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phiên bản</label>
                  <input required value={formData.variant} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { variant: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 2.5Q"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Màu sắc</label>
                  <select value={formData.color} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { color: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="Đen">Đen</option>
                    <option value="Trắng">Trắng</option>
                    <option value="Bạc">Bạc</option>
                    <option value="Đỏ">Đỏ</option>
                    <option value="Xanh">Xanh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Năm sản xuất</label>
                  <input type="number" required value={formData.year} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { year: parseInt(e.target.value) || 2026 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá niêm yết</label>
                  <input type="number" required value={formData.listPrice} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { listPrice: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá sàn (Floor)</label>
                  <input type="number" required value={formData.floorPrice} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { floorPrice: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái xe</label>
                <select value={formData.status} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { status: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="AVAILABLE">Sẵn có (Available)</option>
                  <option value="RESERVED">Đặt cọc (Reserved)</option>
                  <option value="INCOMING">Đang về (Incoming)</option>
                  <option value="SOLD">Đã bán (Sold)</option>
                </select>
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
