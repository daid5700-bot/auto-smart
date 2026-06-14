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
exports.default = LoginPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var store_1 = require("@/lib/store");
var rbac_1 = require("@/config/rbac");
var lucide_react_1 = require("lucide-react");
var ROLES = [
    { role: "ADMIN", icon: <lucide_react_1.Shield size={16}/>, label: "Admin" },
    { role: "WAREHOUSE", icon: <lucide_react_1.BarChart3 size={16}/>, label: "Kho" },
    { role: "WORKSHOP", icon: <lucide_react_1.Wrench size={16}/>, label: "Xưởng" },
    { role: "SALES", icon: <lucide_react_1.Car size={16}/>, label: "Sales" },
    { role: "CRM", icon: <lucide_react_1.Zap size={16}/>, label: "CSKH" },
];
function LoginPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var _a = (0, store_1.useAuth)(), login = _a.login, loginAs = _a.loginAs;
    var _b = (0, react_1.useState)(""), email = _b[0], setEmail = _b[1];
    var _c = (0, react_1.useState)(""), password = _c[0], setPassword = _c[1];
    var _d = (0, react_1.useState)(false), showPw = _d[0], setShowPw = _d[1];
    var _e = (0, react_1.useState)(""), error = _e[0], setError = _e[1];
    var _f = (0, react_1.useState)(false), loading = _f[0], setLoading = _f[1];
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var success, u;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    setError("");
                    setLoading(true);
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 600); })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, login(email, password)];
                case 2:
                    success = _a.sent();
                    if (success) {
                        u = store_1.useAuth.getState().user;
                        if (u)
                            router.push((0, rbac_1.getDefaultPath)(u.role));
                    }
                    else
                        setError("Email hoặc mật khẩu không đúng. Thử: admin@autosmart.vn / admin123");
                    setLoading(false);
                    return [2 /*return*/];
            }
        });
    }); };
    var quickLogin = function (role) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, loginAs(role)];
            case 1:
                _a.sent();
                router.push((0, rbac_1.getDefaultPath)(role));
                return [2 /*return*/];
        }
    }); }); };
    return (<div className="min-h-screen flex bg-background bg-grid-pattern">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 gradient-primary opacity-[0.07]"/>
        <div className="absolute inset-0 bg-dot-pattern opacity-30"/>
        <div className="relative z-10 px-16 animate-slide-in-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-blue"><lucide_react_1.Car size={28} className="text-white"/></div>
            <div><h1 className="text-3xl font-bold">AUTO-SMART</h1><p className="text-sm text-muted-foreground font-medium">CRM & ERP Platform</p></div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-6"><span className="gradient-text">Số hóa toàn diện</span><br />Đại lý & Garage Ô tô</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">Quản lý kho phụ tùng, xưởng sửa chữa, bán xe và chăm sóc khách hàng — tất cả trong một nền tảng.</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
            { icon: <lucide_react_1.BarChart3 size={20}/>, t: "Phân tích Realtime", d: "Báo cáo doanh thu tức thì" },
            { icon: <lucide_react_1.Wrench size={20}/>, t: "Xưởng thông minh", d: "Quản lý KTV & lệnh sửa chữa" },
            { icon: <lucide_react_1.Zap size={20}/>, t: "Tự động hóa", d: "ZNS nhắc lịch bảo dưỡng" },
            { icon: <lucide_react_1.Shield size={20}/>, t: "Phân quyền RBAC", d: "Bảo mật theo phòng ban" },
        ].map(function (f, i) { return (<div key={i} className="glass-card rounded-xl p-4 hover:-translate-y-0.5 transition-transform duration-300">
                <div className="text-primary mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold">{f.t}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
              </div>); })}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-in-bottom">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><lucide_react_1.Car size={24} className="text-white"/></div>
            <div><h1 className="text-2xl font-bold">AUTO-SMART</h1><p className="text-xs text-muted-foreground">CRM & ERP</p></div>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-1">Đăng nhập</h2>
            <p className="text-muted-foreground text-sm mb-8">Vui lòng đăng nhập để tiếp tục</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <lucide_react_1.Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input id="login-email" type="email" value={email} onChange={function (e) { return setEmail(e.target.value); }} placeholder="admin@autosmart.vn" className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"/>
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-2">Mật khẩu</label>
                <div className="relative">
                  <lucide_react_1.Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={function (e) { return setPassword(e.target.value); }} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"/>
                  <button type="button" onClick={function () { return setShowPw(!showPw); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPw ? <lucide_react_1.EyeOff size={18}/> : <lucide_react_1.Eye size={18}/>}</button>
                </div>
              </div>
              {error && <p className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Đăng nhập"}
              </button>
            </form>
          </div>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground text-center mb-3">⚡ Đăng nhập nhanh (Demo)</p>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map(function (_a) {
            var role = _a.role, icon = _a.icon, label = _a.label;
            return (<button key={role} onClick={function () { return quickLogin(role); }} className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 hover:border-primary/30 bg-card/50 hover:bg-card transition-all">
                  <div className={"w-8 h-8 rounded-lg bg-gradient-to-br ".concat((0, rbac_1.roleColor)(role), " flex items-center justify-center text-white group-hover:scale-110 transition-transform")}>{icon}</div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-medium">{label}</span>
                </button>);
        })}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
