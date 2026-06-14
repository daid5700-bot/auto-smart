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
exports.default = ImportPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var actions_1 = require("@/app/actions");
function ImportPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), movements = _a[0], setMovements = _a[1];
    var _b = (0, react_1.useState)([]), products = _b[0], setProducts = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), modalOpen = _d[0], setModalOpen = _d[1];
    // Form State
    var _e = (0, react_1.useState)({
        productId: "",
        quantity: 1,
        unitCost: 0,
        conversionFactor: 1,
    }), formData = _e[0], setFormData = _e[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, movRes, prodRes, movData, prodData, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, 5, 6]);
                    return [4 /*yield*/, Promise.all([
                            fetch("/api/inventory/movements?type=IMPORT"),
                            fetch("/api/inventory"),
                        ])];
                case 1:
                    _a = _b.sent(), movRes = _a[0], prodRes = _a[1];
                    return [4 /*yield*/, movRes.json()];
                case 2:
                    movData = _b.sent();
                    return [4 /*yield*/, prodRes.json()];
                case 3:
                    prodData = _b.sent();
                    setMovements(movData.movements || []);
                    setProducts(prodData.products || []);
                    return [3 /*break*/, 6];
                case 4:
                    e_1 = _b.sent();
                    console.error(e_1);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        fetchData();
    }, []);
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    setLoading(true);
                    return [4 /*yield*/, (0, actions_1.importStock)({
                            productId: parseInt(formData.productId),
                            quantity: Number(formData.quantity),
                            unitCost: Number(formData.unitCost),
                            conversionFactor: Number(formData.conversionFactor),
                        })];
                case 2:
                    _a.sent();
                    setModalOpen(false);
                    setFormData({ productId: "", quantity: 1, unitCost: 0, conversionFactor: 1 });
                    return [4 /*yield*/, fetchData()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    console.error(err_1);
                    alert("Lỗi nhập kho: " + err_1.message);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading && movements.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nhập kho phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý lịch sử nhập phụ tùng và cập nhật số lượng tồn kho</p>
        </div>
        <button onClick={function () { return setModalOpen(true); }} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <lucide_react_1.Plus size={16}/> Nhập kho mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>SKU</th>
              <th>Tên phụ tùng</th>
              <th>Số lượng nhập</th>
              <th>Đơn giá vốn</th>
              <th>Tổng chi phí</th>
              <th>Người nhập</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(function (m) {
            var _a, _b, _c;
            return (<tr key={m.id}>
                <td className="text-muted-foreground text-xs">{(0, utils_1.formatDate)(m.createdAt)}</td>
                <td><code className="text-xs font-semibold text-primary">{(_a = m.product) === null || _a === void 0 ? void 0 : _a.sku}</code></td>
                <td className="font-medium">{(_b = m.product) === null || _b === void 0 ? void 0 : _b.name}</td>
                <td>{m.quantity} {(_c = m.product) === null || _c === void 0 ? void 0 : _c.unit}</td>
                <td>{(0, utils_1.formatCurrency)(Number(m.unitCost))}</td>
                <td className="font-semibold">{(0, utils_1.formatCurrency)(Number(m.totalCost))}</td>
                <td className="text-muted-foreground">{m.createdBy}</td>
              </tr>);
        })}
            {movements.length === 0 && (<tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lịch sử nhập kho</td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Nhập kho phụ tùng</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground">
                <lucide_react_1.Plus size={20} className="rotate-45"/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Chọn phụ tùng</label>
                <select required value={formData.productId} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { productId: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="">-- Chọn phụ tùng cần nhập --</option>
                  {products.map(function (p) { return (<option key={p.id} value={p.id}>{p.name} ({p.sku}) - Tồn: {p.stockCount}</option>); })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số lượng nhập</label>
                  <input type="number" required min={1} value={formData.quantity} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { quantity: parseInt(e.target.value) || 1 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Hệ số quy đổi (Thùng → Chai lẻ)</label>
                  <input type="number" required min={1} value={formData.conversionFactor} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { conversionFactor: parseInt(e.target.value) || 1 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tổng tiền vốn nhập (VND)</label>
                <input type="number" required min={0} value={formData.unitCost} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { unitCost: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"/>
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
