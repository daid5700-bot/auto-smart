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
exports.default = PricingPage;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function PricingPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), products = _a[0], setProducts = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(null), editingId = _c[0], setEditingId = _c[1];
    // Editing Prices State
    var _d = (0, react_1.useState)(0), retailPrice = _d[0], setRetailPrice = _d[1];
    var _e = (0, react_1.useState)(0), wholesalePrice = _e[0], setWholesalePrice = _e[1];
    var _f = (0, react_1.useState)(0), insurancePrice = _f[0], setInsurancePrice = _f[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/inventory")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setProducts(data.products || []);
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
    var handleStartEdit = function (p) {
        var _a, _b, _c;
        setEditingId(p.id);
        var retail = ((_a = p.prices.find(function (pr) { return pr.type === "RETAIL"; })) === null || _a === void 0 ? void 0 : _a.amount) || 0;
        var wholesale = ((_b = p.prices.find(function (pr) { return pr.type === "WHOLESALE"; })) === null || _b === void 0 ? void 0 : _b.amount) || 0;
        var insurance = ((_c = p.prices.find(function (pr) { return pr.type === "INSURANCE"; })) === null || _c === void 0 ? void 0 : _c.amount) || 0;
        setRetailPrice(Number(retail));
        setWholesalePrice(Number(wholesale));
        setInsurancePrice(Number(insurance));
    };
    var handleSave = function (productId) { return __awaiter(_this, void 0, void 0, function () {
        var prices, res, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, 5, 6]);
                    setLoading(true);
                    prices = [
                        { type: "RETAIL", amount: retailPrice },
                        { type: "WHOLESALE", amount: wholesalePrice },
                        { type: "INSURANCE", amount: insurancePrice },
                    ];
                    return [4 /*yield*/, fetch("/api/inventory/".concat(productId), {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prices: prices }),
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 3];
                    setEditingId(null);
                    return [4 /*yield*/, fetchData()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [3 /*break*/, 6];
                case 4:
                    e_2 = _a.sent();
                    console.error(e_2);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading && products.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Bảng giá phụ tùng</h2>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình đa bảng giá (Giá bán lẻ, Giá bán buôn/đại lý, Giá bảo hiểm)</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Tên phụ tùng</th>
              <th>Đơn vị</th>
              <th>Giá Bán Lẻ</th>
              <th>Giá Bán Buôn (Đại lý)</th>
              <th>Giá Bảo Hiểm</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map(function (p) {
            var _a, _b, _c;
            var isEditing = editingId === p.id;
            var retail = ((_a = p.prices.find(function (pr) { return pr.type === "RETAIL"; })) === null || _a === void 0 ? void 0 : _a.amount) || 0;
            var wholesale = ((_b = p.prices.find(function (pr) { return pr.type === "WHOLESALE"; })) === null || _b === void 0 ? void 0 : _b.amount) || 0;
            var insurance = ((_c = p.prices.find(function (pr) { return pr.type === "INSURANCE"; })) === null || _c === void 0 ? void 0 : _c.amount) || 0;
            return (<tr key={p.id}>
                  <td><code className="text-xs font-semibold text-primary">{p.sku}</code></td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-muted-foreground">{p.unit}</td>
                  <td>
                    {isEditing ? (<input type="number" value={retailPrice} onChange={function (e) { return setRetailPrice(parseInt(e.target.value) || 0); }} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none"/>) : (<span className="font-semibold text-primary">{(0, utils_1.formatCurrency)(Number(retail))}</span>)}
                  </td>
                  <td>
                    {isEditing ? (<input type="number" value={wholesalePrice} onChange={function (e) { return setWholesalePrice(parseInt(e.target.value) || 0); }} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none"/>) : (<span className="font-semibold text-success">{(0, utils_1.formatCurrency)(Number(wholesale))}</span>)}
                  </td>
                  <td>
                    {isEditing ? (<input type="number" value={insurancePrice} onChange={function (e) { return setInsurancePrice(parseInt(e.target.value) || 0); }} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none"/>) : (<span className="font-semibold text-purple-600">{(0, utils_1.formatCurrency)(Number(insurance))}</span>)}
                  </td>
                  <td>
                    {isEditing ? (<div className="flex gap-2">
                        <button onClick={function () { return handleSave(p.id); }} className="p-1.5 bg-success/10 text-success hover:bg-success/20 rounded"><lucide_react_1.Check size={14}/></button>
                        <button onClick={function () { return setEditingId(null); }} className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded"><lucide_react_1.X size={14}/></button>
                      </div>) : (<button onClick={function () { return handleStartEdit(p); }} className="p-1.5 hover:bg-secondary rounded text-primary flex items-center gap-1 text-xs font-semibold"><lucide_react_1.Edit2 size={12}/> Sửa giá</button>)}
                  </td>
                </tr>);
        })}
          </tbody>
        </table>
      </div>
    </div>);
}
