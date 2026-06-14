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
exports.default = WorkshopPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var RO_COLS = [
    { status: "PENDING", label: "Chờ sửa", border: "border-t-blue-500/50" },
    { status: "DIAGNOSING", label: "Chẩn đoán", border: "border-t-amber-500/50" },
    { status: "REPAIRING", label: "Đang sửa", border: "border-t-purple-500/50" },
    { status: "WAITING_PARTS", label: "Chờ phụ tùng", border: "border-t-rose-500/50" },
    { status: "DONE", label: "Hoàn thành", border: "border-t-emerald-500/50" },
];
function WorkshopPage() {
    var _this = this;
    var _a, _b, _c, _d, _e;
    var _f = (0, react_1.useState)(null), data = _f[0], setData = _f[1];
    var _g = (0, react_1.useState)(true), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)("kanban"), view = _h[0], setView = _h[1];
    // Printing state
    var _j = (0, react_1.useState)(false), printOpen = _j[0], setPrintOpen = _j[1];
    var _k = (0, react_1.useState)(null), printRo = _k[0], setPrintRo = _k[1];
    // Modal State
    var _l = (0, react_1.useState)(false), modalOpen = _l[0], setModalOpen = _l[1];
    var _m = (0, react_1.useState)(null), editingId = _m[0], setEditingId = _m[1];
    var _o = (0, react_1.useState)({
        plateNumber: "",
        vehicleModel: "",
        kmIn: 0,
        symptoms: "",
        status: "PENDING",
        technicianId: "",
        laborCost: 0,
        partsCost: 0,
        customerId: "", // auto-populated for demo
        carCondition: "",
    }), formData = _o[0], setFormData = _o[1];
    var fetchData = function () {
        fetch("/api/workshop")
            .then(function (r) { return r.json(); })
            .then(setData)
            .finally(function () { return setLoading(false); });
    };
    (0, react_1.useEffect)(function () {
        fetchData();
    }, []);
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa lệnh sửa chữa này?"))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch("/api/workshop/".concat(id), { method: "DELETE" })];
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
        var _a, _b, _c, _d, _e, _f;
        setEditingId(null);
        setFormData({
            plateNumber: "",
            vehicleModel: "",
            kmIn: 0,
            symptoms: "",
            status: "PENDING",
            technicianId: ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.technicians) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.toString()) || "",
            laborCost: 0,
            partsCost: 0,
            customerId: ((_f = (_e = (_d = data === null || data === void 0 ? void 0 : data.customers) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.id) === null || _f === void 0 ? void 0 : _f.toString()) || "1",
            carCondition: "",
        });
        setModalOpen(true);
    };
    var handleOpenEdit = function (ro) {
        var _a, _b, _c;
        setEditingId(ro.id);
        setFormData({
            plateNumber: ro.plateNumber,
            vehicleModel: ro.vehicleModel,
            kmIn: ro.kmIn,
            symptoms: ro.symptoms,
            status: ro.status,
            technicianId: ((_a = ro.technicianId) === null || _a === void 0 ? void 0 : _a.toString()) || "",
            laborCost: Number(ro.laborCost),
            partsCost: Number(ro.partsCost),
            customerId: ((_b = ro.customerId) === null || _b === void 0 ? void 0 : _b.toString()) || "",
            carCondition: ((_c = ro.photos) === null || _c === void 0 ? void 0 : _c[0]) || "",
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
                    url = editingId ? "/api/workshop/".concat(editingId) : "/api/workshop";
                    payload = {
                        plateNumber: formData.plateNumber,
                        vehicleModel: formData.vehicleModel,
                        kmIn: Number(formData.kmIn),
                        symptoms: formData.symptoms,
                        status: formData.status,
                        laborCost: Number(formData.laborCost),
                        partsCost: Number(formData.partsCost),
                        technicianId: formData.technicianId ? parseInt(formData.technicianId) : null,
                        customerId: formData.customerId ? parseInt(formData.customerId) : 1,
                        photos: formData.carCondition ? [formData.carCondition] : [],
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
    var repairOrders = (data === null || data === void 0 ? void 0 : data.repairOrders) || [];
    var technicians = (data === null || data === void 0 ? void 0 : data.technicians) || [];
    var customers = (data === null || data === void 0 ? void 0 : data.customers) || [];
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Xưởng dịch vụ</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu từ PostgreSQL — Theo dõi tiến độ KTV và Lệnh sửa chữa</p></div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"><lucide_react_1.Plus size={16}/>Tạo lệnh sửa chữa (RO)</button>
      </div>

      {/* KTV status tracking */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {technicians.map(function (ktv) {
            var _a;
            return (<div key={ktv.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center text-sm font-bold text-primary">{(_a = ktv.name) === null || _a === void 0 ? void 0 : _a.charAt(0)}</div>
              <span className={"status-dot absolute bottom-0 right-0 ".concat(ktv.status === "IDLE" ? "online" : "busy")}/>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{ktv.name}</p>
              <p className="text-[10px] text-muted-foreground">{ktv.status === "IDLE" ? "Đang rảnh" : "Đang sửa xe"}</p>
            </div>
          </div>);
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={function () { return setView("kanban"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold ".concat(view === "kanban" ? "bg-primary text-white" : "bg-card border border-border")}>Kanban Board</button>
        <button onClick={function () { return setView("list"); }} className={"px-4 py-2 rounded-xl text-xs font-semibold ".concat(view === "list" ? "bg-primary text-white" : "bg-card border border-border")}>Dạng bảng</button>
      </div>

      {view === "kanban" ? (<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {RO_COLS.map(function (col) {
                var items = repairOrders.filter(function (ro) { return ro.status === col.status; });
                return (<div key={col.status} className={"kanban-column p-3 border-t-2 ".concat(col.border)}>
                <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-muted-foreground uppercase">{col.label}</h3><span className="badge badge-primary text-[10px]">{items.length}</span></div>
                <div className="space-y-2">
                  {items.map(function (ro) {
                        var _a, _b, _c;
                        return (<div key={ro.id} className="kanban-card group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary">{ro.plateNumber}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={function () { setPrintRo(ro); setPrintOpen(true); }} className="p-1 hover:bg-secondary text-primary rounded" title="In báo giá"><lucide_react_1.Printer size={12}/></button>
                          <button onClick={function () { return handleOpenEdit(ro); }} className="p-1 hover:bg-secondary text-primary rounded"><lucide_react_1.Edit size={12}/></button>
                          <button onClick={function () { return handleDelete(ro.id); }} className="p-1 hover:bg-secondary text-destructive rounded"><lucide_react_1.Trash2 size={12}/></button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{ro.vehicleModel}</p>
                      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">Khách: {(_a = ro.customer) === null || _a === void 0 ? void 0 : _a.name}</p>
                      <p className="text-[10px] text-muted-foreground italic mb-2 line-clamp-2">" {ro.symptoms} "</p>
                      {((_b = ro.photos) === null || _b === void 0 ? void 0 : _b[0]) && <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/60 mb-2 truncate">⚠️ Tình trạng: {ro.photos[0]}</p>}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">KTV: {((_c = ro.technician) === null || _c === void 0 ? void 0 : _c.name) || "Chưa giao"}</span>
                        <span className="text-[10px] font-bold text-primary">{(0, utils_1.formatCurrency)(Number(ro.totalAmount))}</span>
                      </div>
                    </div>);
                    })}
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 opacity-40">Trống</p>}
                </div>
              </div>);
            })}
        </div>) : (<div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
          <thead><tr><th>Biển số</th><th>Dòng xe</th><th>Khách hàng</th><th>KTV phụ trách</th><th>Triệu chứng</th><th>Chi phí</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{repairOrders.map(function (ro) {
                var _a, _b, _c;
                return (<tr key={ro.id}>
              <td><span className="font-semibold text-primary">{ro.plateNumber}</span></td>
              <td>
                <div>
                  <p className="font-medium">{ro.vehicleModel}</p>
                  {((_a = ro.photos) === null || _a === void 0 ? void 0 : _a[0]) && <p className="text-[10px] text-amber-600 font-medium">⚠️ {ro.photos[0]}</p>}
                </div>
              </td>
              <td>{(_b = ro.customer) === null || _b === void 0 ? void 0 : _b.name}</td><td>{((_c = ro.technician) === null || _c === void 0 ? void 0 : _c.name) || "Chưa giao"}</td>
              <td className="text-xs text-muted-foreground max-w-xs truncate">{ro.symptoms}</td>
              <td className="font-semibold">{(0, utils_1.formatCurrency)(Number(ro.totalAmount))}</td>
              <td><span className={"badge ".concat((0, utils_1.statusBadge)(ro.status))}>{(0, utils_1.statusText)(ro.status)}</span></td>
              <td>
                <div className="flex items-center gap-2">
                  <button onClick={function () { setPrintRo(ro); setPrintOpen(true); }} className="p-1 hover:bg-secondary rounded text-primary" title="In báo giá"><lucide_react_1.Printer size={14}/></button>
                  <button onClick={function () { return handleOpenEdit(ro); }} className="p-1 hover:bg-secondary rounded text-primary"><lucide_react_1.Edit size={14}/></button>
                  <button onClick={function () { return handleDelete(ro.id); }} className="p-1 hover:bg-secondary rounded text-destructive"><lucide_react_1.Trash2 size={14}/></button>
                </div>
              </td>
            </tr>);
            })}</tbody>
        </table></div>)}

      {/* CRUD Modal */}
      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật lệnh sửa chữa (RO)" : "Tạo Lệnh sửa chữa mới (RO)"}</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground"><lucide_react_1.X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Biển số xe</label>
                  <input required value={formData.plateNumber} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { plateNumber: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 30F-123.45"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Model xe</label>
                  <input required value={formData.vehicleModel} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { vehicleModel: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Toyota Camry 2026"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số KM vào xưởng</label>
                  <input type="number" required value={formData.kmIn} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { kmIn: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Chỉ định Khách hàng</label>
                  <select value={formData.customerId} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { customerId: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    {customers.map(function (c) { return <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>; })}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giao KTV</label>
                  <select value={formData.technicianId} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { technicianId: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">-- Chưa giao việc --</option>
                    {technicians.map(function (ktv) { return <option key={ktv.id} value={ktv.id}>{ktv.name}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái sửa chữa</label>
                  <select value={formData.status} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { status: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="PENDING">Chờ sửa (Pending)</option>
                    <option value="DIAGNOSING">Chẩn đoán (Diagnosing)</option>
                    <option value="REPAIRING">Đang sửa (Repairing)</option>
                    <option value="WAITING_PARTS">Chờ phụ tùng (Waiting Parts)</option>
                    <option value="DONE">Hoàn thành (Done)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tiền công thợ</label>
                  <input type="number" required value={formData.laborCost} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { laborCost: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tiền phụ tùng thay thế</label>
                  <input type="number" required value={formData.partsCost} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { partsCost: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Triệu chứng / Yêu cầu</label>
                  <textarea required value={formData.symptoms} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { symptoms: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]" placeholder="VD: Động cơ kêu to khi khởi động, cần bảo dưỡng lọc dầu..."/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tình trạng xe (Trầy xước/Móp méo/Ảnh)</label>
                  <textarea value={formData.carCondition} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { carCondition: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]" placeholder="VD: Trầy xước nhẹ tai xe bên lái, kính lái bình thường..."/>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={function () { return setModalOpen(false); }} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>)}

      {/* Print Preview Modal */}
      {printOpen && printRo && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none print:h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden bg-secondary/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <lucide_react_1.Printer size={18}/>
                Xem trước báo giá (Quotation Preview)
              </h3>
              <button onClick={function () { setPrintOpen(false); setPrintRo(null); }} className="text-muted-foreground hover:text-foreground">
                <lucide_react_1.X size={20}/>
              </button>
            </div>
            
            <div id="print-area" className="p-8 space-y-6 overflow-y-auto flex-1 text-foreground print:text-black print:p-0 print:overflow-visible">
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-primary print:text-black">Auto-Smart CRM & ERP</h2>
                  <p className="text-xs text-muted-foreground print:text-black">Hệ thống quản lý dịch vụ Garage thế hệ mới</p>
                  <p className="text-xs text-muted-foreground print:text-black mt-1">Hotline: 1900.8888 - Địa chỉ: Hà Nội, Việt Nam</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold uppercase">Phiếu báo giá sửa chữa</h3>
                  <p className="text-xs text-muted-foreground font-mono print:text-black">Mã RO: RO-{printRo.id.toString().padStart(4, "0")}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Ngày: {(0, utils_1.formatDate)(printRo.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-secondary/10 p-4 rounded-xl border border-border/50 print:bg-transparent print:border-none print:p-0">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Khách hàng</h4>
                  <p className="text-sm font-bold">{((_a = printRo.customer) === null || _a === void 0 ? void 0 : _a.name) || "Khách vãng lai"}</p>
                  <p className="text-xs text-muted-foreground print:text-black">SĐT: {(_b = printRo.customer) === null || _b === void 0 ? void 0 : _b.phone}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Email: {((_c = printRo.customer) === null || _c === void 0 ? void 0 : _c.email) || "—"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Thông tin xe</h4>
                  <p className="text-sm font-bold text-primary print:text-black font-mono">{printRo.plateNumber}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Dòng xe: {printRo.vehicleModel || "—"}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Số KM vào xưởng: {printRo.kmIn} km</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Triệu chứng & Tình trạng xe lúc nhận</h4>
                <div className="bg-card border border-border p-3 rounded-lg text-xs space-y-1.5 print:bg-white print:text-black">
                  <p><strong>Triệu chứng của khách:</strong> {printRo.symptoms || "Không ghi nhận"}</p>
                  {((_d = printRo.photos) === null || _d === void 0 ? void 0 : _d[0]) && (<p className="text-amber-600 dark:text-amber-400 print:text-black font-semibold">
                      <strong>⚠️ Tình trạng ngoại thất (Trầy xước/Móp méo):</strong> {printRo.photos[0]}
                    </p>)}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 print:text-black">Chi tiết báo giá dịch vụ</h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground uppercase font-semibold">
                      <th className="py-2">Hạng mục công việc</th>
                      <th className="py-2 text-right">Chi phí ước tính</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40">
                      <td className="py-3">
                        <p className="font-semibold">Tiền công thợ (Labor Fee)</p>
                        <p className="text-[10px] text-muted-foreground print:text-black">Thực hiện bởi KTV: {((_e = printRo.technician) === null || _e === void 0 ? void 0 : _e.name) || "Chưa phân phối"}</p>
                      </td>
                      <td className="py-3 text-right font-medium">{(0, utils_1.formatCurrency)(Number(printRo.laborCost))}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="py-3">
                        <p className="font-semibold">Chi phí phụ tùng thay thế (Parts Cost)</p>
                        <p className="text-[10px] text-muted-foreground print:text-black">Vật tư chính hãng Auto-Smart</p>
                      </td>
                      <td className="py-3 text-right font-medium">{(0, utils_1.formatCurrency)(Number(printRo.partsCost))}</td>
                    </tr>
                    <tr className="font-bold text-sm">
                      <td className="py-4 text-right pr-4">Tổng cộng tạm tính (VND):</td>
                      <td className="py-4 text-right text-primary print:text-black text-base">{(0, utils_1.formatCurrency)(Number(printRo.totalAmount))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-xs pt-8 border-t border-border/40">
                <div>
                  <p className="font-semibold uppercase mb-12">Khách hàng xác nhận</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-semibold uppercase mb-12">Đại diện cố vấn dịch vụ</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-border print:hidden bg-secondary/10">
              <button type="button" onClick={function () { setPrintOpen(false); setPrintRo(null); }} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">
                Hủy bỏ
              </button>
              <button type="button" onClick={function () { return window.print(); }} className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
                <lucide_react_1.Printer size={16}/>
                In báo giá (Print)
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
