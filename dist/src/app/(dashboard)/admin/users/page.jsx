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
exports.default = UsersPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var rbac_1 = require("@/config/rbac");
function UsersPage() {
    var _this = this;
    var _a = (0, react_1.useState)([]), users = _a[0], setUsers = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), modalOpen = _c[0], setModalOpen = _c[1];
    var _d = (0, react_1.useState)(null), editingId = _d[0], setEditingId = _d[1];
    // Form State
    var _e = (0, react_1.useState)({
        name: "",
        email: "",
        password: "",
        role: "CRM",
    }), formData = _e[0], setFormData = _e[1];
    var fetchData = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, fetch("/api/users")];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    setUsers(data.users || []);
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
    var handleDelete = function (id, email) { return __awaiter(_this, void 0, void 0, function () {
        var res, data, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (email === "admin@autosmart.vn") {
                        alert("Không thể xóa tài khoản Quản trị viên tối cao (admin@autosmart.vn)!");
                        return [2 /*return*/];
                    }
                    if (!confirm("B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\u00F3a nh\u00E2n vi\u00EAn \"".concat(email, "\" kh\u1ECFi h\u1EC7 th\u1ED1ng?")))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    setLoading(true);
                    return [4 /*yield*/, fetch("/api/users/".concat(id), { method: "DELETE" })];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _a.sent();
                    if (!res.ok) {
                        throw new Error(data.error || "Lỗi xóa người dùng");
                    }
                    return [4 /*yield*/, fetchData()];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    e_2 = _a.sent();
                    alert(e_2.message);
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
        setFormData({
            name: "",
            email: "",
            password: "",
            role: "CRM",
        });
        setModalOpen(true);
    };
    var handleOpenEdit = function (u) {
        setEditingId(u.id);
        setFormData({
            name: u.name,
            email: u.email,
            password: "", // blank password means no change
            role: u.role,
        });
        setModalOpen(true);
    };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var method, url, payload, res, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    setLoading(true);
                    method = editingId ? "PATCH" : "POST";
                    url = editingId ? "/api/users/".concat(editingId) : "/api/users";
                    payload = {
                        name: formData.name,
                        email: formData.email,
                        role: formData.role,
                    };
                    if (formData.password || !editingId) {
                        payload.password = formData.password;
                    }
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        })];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _a.sent();
                    if (!res.ok) {
                        throw new Error(data.error || "Gặp lỗi xử lý tài khoản");
                    }
                    setModalOpen(false);
                    return [4 /*yield*/, fetchData()];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    err_1 = _a.sent();
                    alert(err_1.message);
                    return [3 /*break*/, 7];
                case 6:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    if (loading && users.length === 0) {
        return <div className="flex items-center justify-center h-64"><lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
    }
    return (<div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản trị người dùng hệ thống</h2>
          <p className="text-muted-foreground text-sm mt-1">Danh sách tài khoản nhân viên và vai trò truy cập trong hệ thống ERP & CRM</p>
        </div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <lucide_react_1.Plus size={16}/> Thêm tài khoản mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Địa chỉ Email</th>
              <th>Quyền truy cập (Role)</th>
              <th>Ngày tạo tài khoản</th>
              <th className="w-[120px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(function (u) { return (<tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={"w-8 h-8 rounded-full bg-gradient-to-br ".concat((0, rbac_1.roleColor)(u.role), " flex items-center justify-center text-white text-xs font-bold")}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-semibold">{u.name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={"badge bg-primary/10 text-primary font-bold text-[10px]"}>
                    {(0, rbac_1.roleName)(u.role)}
                  </span>
                </td>
                <td className="text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={function () { return handleOpenEdit(u); }} className="p-1.5 hover:bg-secondary rounded text-primary" title="Sửa thông tin"><lucide_react_1.Edit size={14}/></button>
                    {u.email !== "admin@autosmart.vn" && (<button onClick={function () { return handleDelete(u.id, u.email); }} className="p-1.5 hover:bg-secondary rounded text-destructive" title="Xóa tài khoản"><lucide_react_1.Trash2 size={14}/></button>)}
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>

      {/* CRUD User Modal */}
      {modalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h3>
              <button onClick={function () { return setModalOpen(false); }} className="text-muted-foreground hover:text-foreground">
                <lucide_react_1.X size={20}/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên nhân viên</label>
                <input required value={formData.name} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { name: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Đỗ Thế Kỷ"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ Email</label>
                <input type="email" required value={formData.email} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { email: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: nhanvien@autosmart.vn"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  {editingId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu ban đầu"}
                </label>
                <input type="password" required={!editingId} value={formData.password} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { password: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder={editingId ? "••••••••" : "Mật khẩu để đăng nhập"}/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Quyền hạn truy cập</label>
                <select value={formData.role} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { role: e.target.value })); }} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="ADMIN">Quản trị viên (Full Access)</option>
                  <option value="WAREHOUSE">Nhân viên Kho phụ tùng</option>
                  <option value="WORKSHOP">Cố vấn / KTV Xưởng dịch vụ</option>
                  <option value="SALES">Nhân viên Kinh doanh xe</option>
                  <option value="CRM">Nhân viên CSKH / Marketing</option>
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
