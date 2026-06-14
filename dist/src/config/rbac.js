"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.getDefaultPath = getDefaultPath;
exports.roleName = roleName;
exports.roleColor = roleColor;
exports.ROLE_PERMISSIONS = {
    ADMIN: [
        "inventory.view", "inventory.manage", "inventory.pricing",
        "workshop.view", "workshop.manage", "workshop.commission",
        "sales.view", "sales.manage", "sales.pricing",
        "crm.view", "crm.manage", "crm.zns", "crm.loyalty",
        "admin.dashboard", "admin.users", "admin.reports",
    ],
    WAREHOUSE: ["inventory.view", "inventory.manage", "inventory.pricing"],
    WORKSHOP: ["workshop.view", "workshop.manage", "workshop.commission", "inventory.view"],
    SALES: ["sales.view", "sales.manage", "sales.pricing", "crm.view"],
    CRM: ["crm.view", "crm.manage", "crm.zns", "crm.loyalty"],
};
function hasPermission(role, perm) {
    var _a, _b;
    return (_b = (_a = exports.ROLE_PERMISSIONS[role]) === null || _a === void 0 ? void 0 : _a.includes(perm)) !== null && _b !== void 0 ? _b : false;
}
function getDefaultPath(role) {
    return { ADMIN: "/admin", WAREHOUSE: "/inventory", WORKSHOP: "/workshop", SALES: "/sales", CRM: "/crm" }[role];
}
function roleName(role) {
    return { ADMIN: "Quản trị viên", WAREHOUSE: "Nhân viên Kho", WORKSHOP: "Xưởng dịch vụ", SALES: "Kinh doanh", CRM: "CSKH" }[role];
}
function roleColor(role) {
    return { ADMIN: "from-red-500 to-orange-500", WAREHOUSE: "from-amber-500 to-yellow-500", WORKSHOP: "from-purple-500 to-pink-500", SALES: "from-blue-500 to-cyan-500", CRM: "from-emerald-500 to-teal-500" }[role];
}
