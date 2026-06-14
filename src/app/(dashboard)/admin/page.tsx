"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatNumber, statusText, statusBadge } from "@/lib/utils";
import { DollarSign, ShoppingCart, Users, Wrench, ArrowUpRight, AlertTriangle, MessageSquare, Car, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return <p className="text-destructive">Không thể tải dữ liệu. Hãy chắc chắn database đã được seed.</p>;

  const STATS = [
    { title: "Đơn sửa chữa đang xử lý", value: data.activeRepairOrders?.toString() || "0", icon: Wrench, grad: "from-amber-500 to-orange-500", glow: "glow-amber" },
    { title: "Khách hàng", value: formatNumber(data.totalCustomers || 0), icon: Users, grad: "from-purple-500 to-pink-500", glow: "" },
    { title: "Lead chờ xử lý", value: (data.pendingLeads || 0).toString(), icon: ShoppingCart, grad: "from-emerald-500 to-teal-500", glow: "glow-green" },
    { title: "Xe sẵn sàng bán", value: (data.availableVehicles || 0).toString(), icon: Car, grad: "from-blue-500 to-cyan-500", glow: "glow-blue" },
  ];

  return (
    <div className="space-y-6 stagger">
      <div><h2 className="text-2xl font-bold">Tổng quan hệ thống</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu realtime từ PostgreSQL.</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((c, i) => { const Icon = c.icon; return (
          <div key={i} className={`glass-card rounded-xl p-5 hover:-translate-y-0.5 transition-transform ${c.glow}`}>
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-muted-foreground">{c.title}</p><p className="text-2xl font-bold mt-1 animate-count-up">{c.value}</p></div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center`}><Icon size={20} className="text-white" /></div>
            </div>
          </div>
        );})}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Wrench size={16} className="text-purple-400" />Lệnh sửa chữa gần đây</h3>
          <div className="space-y-3">
            {(data.recentRepairOrders || []).map((ro: any) => (
              <div key={ro.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Wrench size={14} className="text-purple-400" /></div>
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{ro.customer?.name}</p><p className="text-xs text-muted-foreground">{ro.plateNumber} • {ro.vehicleModel}</p></div>
                </div>
                <div className="text-right shrink-0 ml-2"><span className={`badge ${statusBadge(ro.status)}`}>{statusText(ro.status)}</span><p className="text-xs text-muted-foreground mt-1">{formatCurrency(Number(ro.totalAmount))}</p></div>
              </div>
            ))}
            {(!data.recentRepairOrders || data.recentRepairOrders.length === 0) && <p className="text-sm text-muted-foreground">Chưa có lệnh sửa chữa nào.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-warning" /><h3 className="text-sm font-semibold">Cảnh báo tồn kho</h3></div>
            {(data.lowStockParts || []).length > 0 ? (data.lowStockParts || []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm mb-1"><span className="text-muted-foreground truncate">{p.name}</span><span className="badge badge-danger">{p.stockCount}/{p.stockMin}</span></div>
            )) : <p className="text-xs text-muted-foreground">Không có cảnh báo</p>}
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3"><MessageSquare size={16} className="text-info" /><h3 className="text-sm font-semibold">ZNS hôm nay</h3></div>
            <p className="text-3xl font-bold">{data.znsSentToday || 0}</p><p className="text-xs text-muted-foreground mt-1">tin nhắn đã gửi</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users size={16} className="text-emerald-400" />Lead mới nhất</h3>
        <div className="space-y-3">
          {(data.recentLeads || []).map((l: any) => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center text-white text-xs font-bold shrink-0">{l.name?.charAt(0)}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{l.name}</p><p className="text-xs text-muted-foreground truncate">{l.interest}</p></div>
              </div>
              <span className={`badge ${statusBadge(l.status)} shrink-0 ml-2`}>{statusText(l.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
