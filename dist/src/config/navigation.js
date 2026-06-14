"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNavForRole = getNavForRole;
var lucide_react_1 = require("lucide-react");
var rbac_1 = require("./rbac");
var NAV = [
    { title: "Tổng quan", items: [
            { title: "Dashboard", href: "/admin", icon: lucide_react_1.LayoutDashboard, perm: "admin.dashboard" },
        ] },
    { title: "Kho phụ tùng", items: [
            { title: "Danh mục phụ tùng", href: "/inventory", icon: lucide_react_1.Package, perm: "inventory.view" },
            { title: "Nhập kho", href: "/inventory/import", icon: lucide_react_1.Warehouse, perm: "inventory.manage" },
            { title: "Xuất kho", href: "/inventory/export", icon: lucide_react_1.ClipboardList, perm: "inventory.manage" },
            { title: "Bảng giá", href: "/inventory/pricing", icon: lucide_react_1.DollarSign, perm: "inventory.pricing" },
        ] },
    { title: "Xưởng dịch vụ", items: [
            { title: "Lệnh sửa chữa", href: "/workshop", icon: lucide_react_1.Wrench, perm: "workshop.view" },
            { title: "Kỹ thuật viên", href: "/workshop/technicians", icon: lucide_react_1.UserCog, perm: "workshop.manage" },
            { title: "Lịch sử xe", href: "/workshop/history", icon: lucide_react_1.History, perm: "workshop.view" },
            { title: "Hoa hồng KTV", href: "/workshop/commission", icon: lucide_react_1.TrendingUp, perm: "workshop.commission" },
        ] },
    { title: "Kinh doanh xe", items: [
            { title: "Kho xe", href: "/sales", icon: lucide_react_1.Car, perm: "sales.view" },
            { title: "Bảng giá xe", href: "/sales/pricing", icon: lucide_react_1.DollarSign, perm: "sales.pricing" },
            { title: "Hồ sơ & Thủ tục", href: "/sales/documents", icon: lucide_react_1.FileText, perm: "sales.manage" },
        ] },
    { title: "Khách hàng (CRM)", items: [
            { title: "Quản lý Lead", href: "/crm", icon: lucide_react_1.Users, perm: "crm.view" },
            { title: "Khách hàng", href: "/crm/customers", icon: lucide_react_1.Users, perm: "crm.view" },
            { title: "Zalo ZNS", href: "/crm/zns", icon: lucide_react_1.MessageSquare, perm: "crm.zns" },
            { title: "Tích điểm", href: "/crm/loyalty", icon: lucide_react_1.Gift, perm: "crm.loyalty" },
            { title: "Nhắc lịch", href: "/crm/reminders", icon: lucide_react_1.Bell, perm: "crm.zns" },
        ] },
    { title: "Hệ thống", items: [
            { title: "Báo cáo", href: "/admin/reports", icon: lucide_react_1.BarChart3, perm: "admin.reports" },
            { title: "Người dùng", href: "/admin/users", icon: lucide_react_1.ShieldCheck, perm: "admin.users" },
            { title: "Cài đặt", href: "/admin/settings", icon: lucide_react_1.Settings, perm: "admin.users" },
        ] },
];
function getNavForRole(role) {
    return NAV.map(function (s) { return (__assign(__assign({}, s), { items: s.items.filter(function (i) { return (0, rbac_1.hasPermission)(role, i.perm); }) })); })
        .filter(function (s) { return s.items.length > 0; });
}
