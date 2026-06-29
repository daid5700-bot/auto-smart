export type UserRole = "ADMIN" | "WAREHOUSE" | "WORKSHOP" | "SALES";

export type Permission =
  | "inventory.view" | "inventory.manage" | "inventory.pricing"
  | "workshop.view" | "workshop.manage" | "workshop.commission"
  | "sales.view" | "sales.manage" | "sales.pricing"
  | "crm.view" | "crm.manage" | "crm.zns" | "crm.loyalty" | "crm.reminders" | "crm.customers"
  | "admin.dashboard" | "admin.users" | "admin.reports";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "inventory.view","inventory.manage","inventory.pricing",
    "workshop.view","workshop.manage","workshop.commission",
    "sales.view","sales.manage","sales.pricing",
    "crm.view","crm.manage","crm.zns","crm.loyalty","crm.reminders","crm.customers",
    "admin.dashboard","admin.users","admin.reports",
  ],
  WAREHOUSE: ["inventory.view","inventory.manage","inventory.pricing"],
  WORKSHOP: [
    "workshop.view","workshop.manage","workshop.commission",
    "inventory.view",
    "crm.view","crm.manage","crm.zns","crm.loyalty","crm.reminders","crm.customers"
  ],
  SALES: ["sales.view","sales.manage","sales.pricing","crm.view","crm.customers","crm.reminders"],
};

export function hasPermission(role: UserRole, perm: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function getDefaultPath(role: UserRole) {
  return { ADMIN: "/admin", WAREHOUSE: "/inventory", WORKSHOP: "/workshop", SALES: "/sales" }[role];
}

export function roleName(role: UserRole) {
  return { ADMIN: "Quản trị viên", WAREHOUSE: "Nhân viên Kho", WORKSHOP: "Xưởng dịch vụ", SALES: "Kinh doanh" }[role];
}

export function roleColor(role: UserRole) {
  return { ADMIN: "from-red-500 to-orange-500", WAREHOUSE: "from-amber-500 to-yellow-500", WORKSHOP: "from-purple-500 to-pink-500", SALES: "from-blue-500 to-cyan-500" }[role];
}
