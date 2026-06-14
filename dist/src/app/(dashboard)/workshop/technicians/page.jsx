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
exports.default = TechniciansPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function TechniciansPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), techs = _a[0], setTechs = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), modalOpen = _c[0], setModalOpen = _c[1];
    var _d = (0, react_1.useState)(null), editingId = _d[0], setEditingId = _d[1];
    // Form state
    var _e = (0, react_1.useState)({
        code: "",
        name: "",
        phone: "",
        commissionRate: 10,
        status: "IDLE",
    }), formData = _e[0], setFormData = _e[1];
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
                    setTechs(data.technicians || []);
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
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var res, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!confirm("Bạn có chắc chắn muốn xóa KTV này?"))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    setLoading(true);
                    return [4 /*yield*/, fetch("/api/technicians/".concat(id), { method: "DELETE" })];
                case 2:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, fetchData()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    e_2 = _a.sent();
                    console.error(e_2);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleOpenAdd = function () {
        setEditingId(null);
        setFormData({ code: "", name: "", phone: "", commissionRate: 10, status: "IDLE" });
        setModalOpen(true);
    };
    var handleOpenEdit = function (t) {
        setEditingId(t.id);
        setFormData({
            code: t.code,
            name: t.name,
            phone: t.phone || "",
            commissionRate: t.commissionRate,
            status: t.status,
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
                    _a.trys.push([1, 5, 6, 7]);
                    setLoading(true);
                    method = editingId ? "PATCH" : "POST";
                    url = editingId ? "/api/technicians/".concat(editingId) : "/api/technicians";
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(formData),
                        })];
                case 2:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 4];
                    setModalOpen(false);
                    return [4 /*yield*/, fetchData()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    err_1 = _a.sent();
                    console.error(err_1);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    if (loading && techs.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Kỹ thuật viên (KTV)</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý hồ sơ nhân sự xưởng, phân công công việc và tỷ lệ hoa hồng sửa chữa</p>
        </div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <lucide_react_1.Plus size={16}/> Thêm KTV mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã KTV</th>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Trạng thái</th>
              <th>Tỷ lệ hoa hồng (%)</th>
              <th>Số lệnh đã sửa</th>
              <th>Tích lũy hoa hồng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {techs.map(function (t) { return (<tr key={t.id}>
                <td><code className="text-xs font-bold text-primary">{t.code}</code></td>
                <td className="font-semibold">{t.name}</td>
                <td>{t.phone || "—"}</td>
                <td>
                  <span className={"badge ".concat(t.status === "IDLE" ? "badge-success" : "badge-warning")}>
                    {t.status === "IDLE" ? "Đang rảnh" : "Đang làm việc"}
                  </span>
                </td>
                <td className="font-medium text-center">{t.commissionRate}%</td>
                <td>{t.completedOrders}</td>
                <td className="font-bold text-primary">{(0, utils_1.formatCurrency)(t.totalCommission)}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={function () { return handleOpenEdit(t); }} className="p-1 hover:bg-secondary rounded text-primary"><lucide_react_1.Edit size={14}/></button>
                    <button onClick={function () { return handleDelete(t.id); }} className="p-1 hover:bg-secondary rounded text-destructive"><lucide_react_1.Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>

      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật KTV" : "Thêm KTV mới"}</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground">
                <lucide_react_1.Plus size={20} className="rotate-45"/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã KTV (Mã số nhân viên)</label>
                  <input required value={formData.code} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { code: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: KTV01"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên KTV</label>
                  <input required value={formData.name} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { name: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Nguyễn Văn Hùng"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số điện thoại</label>
                  <input value={formData.phone} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { phone: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 0901234567"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tỷ lệ hoa hồng (%)</label>
                  <input type="number" required min={0} max={100} value={formData.commissionRate} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { commissionRate: parseInt(e.target.value) || 10 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái công việc</label>
                <select value={formData.status} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { status: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="IDLE">Đang rảnh (Idle)</option>
                  <option value="WORKING">Đang làm việc (Working)</option>
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
