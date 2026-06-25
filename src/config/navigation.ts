import {
  LayoutDashboard, Package, Warehouse, ClipboardList, DollarSign,
  Wrench, UserCog, History, TrendingUp, Car, FileText,
  Users, MessageSquare, Gift, Bell, BarChart3, ShieldCheck, Settings, Building2, Plus,
  type LucideIcon,
} from "lucide-react";
import { type UserRole, type Permission, hasPermission } from "./rbac";

export interface NavItem { title: string; href: string; icon: LucideIcon; perm: Permission; }
export interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { title: "Tổng quan", items: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard, perm: "admin.dashboard" },
  ]},
  { title: "Kho phụ tùng", items: [
    { title: "Thống kê kho", href: "/inventory/stats", icon: TrendingUp, perm: "inventory.view" },
    { title: "Danh mục phụ tùng", href: "/inventory", icon: Package, perm: "inventory.view" },
    { title: "Lệnh xuất/nhập kho", href: "/inventory/movements", icon: Warehouse, perm: "inventory.manage" },
    { title: "Lịch sử phiếu kho", href: "/inventory/history", icon: ClipboardList, perm: "inventory.manage" },
    { title: "Duyệt yêu cầu xuất", href: "/inventory/requisitions", icon: ClipboardList, perm: "inventory.manage" },
    { title: "Khách hàng (Công nợ)", href: "/inventory/customers", icon: Users, perm: "inventory.manage" },
  ]},
  { title: "Xưởng dịch vụ", items: [
    { title: "Thống kê dịch vụ", href: "/workshop/stats", icon: TrendingUp, perm: "workshop.view" },
    { title: "Lệnh sửa chữa", href: "/workshop", icon: Wrench, perm: "workshop.view" },
    { title: "Tạo lệnh mới", href: "/workshop/new", icon: Plus, perm: "workshop.manage" },
    { title: "Kỹ thuật viên", href: "/workshop/technicians", icon: UserCog, perm: "workshop.manage" },
    { title: "Lịch sử xe", href: "/workshop/history", icon: History, perm: "workshop.view" },
  ]},
  { title: "Kinh doanh xe", items: [
    { title: "Thống kê kinh doanh", href: "/sales/stats", icon: TrendingUp, perm: "sales.view" },
    { title: "Kho xe", href: "/sales", icon: Car, perm: "sales.view" },
    { title: "Hồ sơ & Thủ tục", href: "/sales/documents", icon: FileText, perm: "sales.manage" },
  ]},
  { title: "Khách hàng (CRM)", items: [
    { title: "Quản lý Lead", href: "/crm", icon: Users, perm: "crm.view" },
    { title: "Khách hàng", href: "/crm/customers", icon: Users, perm: "crm.view" },
    { title: "Zalo ZNS", href: "/crm/zns", icon: MessageSquare, perm: "crm.zns" },
    { title: "Tích điểm", href: "/crm/loyalty", icon: Gift, perm: "crm.loyalty" },
    { title: "Nhắc lịch", href: "/crm/reminders", icon: Bell, perm: "crm.zns" },
  ]},
  { title: "Hệ thống", items: [
    { title: "Báo cáo", href: "/admin/reports", icon: BarChart3, perm: "admin.reports" },
    { title: "Người dùng", href: "/admin/users", icon: ShieldCheck, perm: "admin.users" },
    { title: "Cơ sở", href: "/admin/branches", icon: Building2, perm: "admin.users" },
    { title: "Cài đặt", href: "/admin/settings", icon: Settings, perm: "admin.users" },
  ]},
];

export function getNavForRole(role: UserRole): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => hasPermission(role, i.perm)) }))
    .filter((s) => s.items.length > 0);
}
