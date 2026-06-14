"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import {
  Wrench, Users, ShoppingCart, AlertTriangle, TrendingUp, TrendingDown, Plus,
  Calendar, DollarSign, Car, MessageSquare, ShieldCheck, Loader2
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => console.error("Error loading dashboard data:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-semibold">
          Không thể tải dữ liệu bảng điều khiển. Hãy chắc chắn database đã được seed.
        </p>
      </div>
    );
  }

  // Active RO formatting
  const formatRoCode = (id: number, dateStr: string) => {
    const d = new Date(dateStr);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
    return `RO-${yyyymmdd}-${id}`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "MỚI TIẾP NHẬN";
      case "DIAGNOSING": return "ĐANG KHẢO SÁT";
      case "DOING": return "ĐANG SỬA";
      case "WAITING_PARTS": return "CHỜ PHỤ TÙNG";
      case "INSPECTING": return "NGHIỆM THU";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-zinc-800 text-zinc-100 border border-zinc-700";
      case "DIAGNOSING": return "bg-blue-950 text-blue-300 border border-blue-900";
      case "DOING": return "bg-amber-950 text-amber-300 border border-amber-900";
      case "WAITING_PARTS": return "bg-rose-950/80 text-rose-300 border border-rose-900/60";
      case "INSPECTING": return "bg-emerald-950 text-emerald-300 border border-emerald-900";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  // Top KTV name for welcome area
  const topKtvName = data.topKtv?.[0]?.name || "Chưa có";

  // Calculate coordinates for SVG area chart (max value based on real revenue, min 10 to avoid div-by-zero)
  const monthlyRevenue = data.monthlyRevenue || [];
  const maxVal = Math.max(...monthlyRevenue.map((r: any) => r.value), 10);
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 20;

  const points = monthlyRevenue.map((m: any, index: number) => {
    const x = (index / 11) * chartWidth + paddingX;
    const y = chartHeight - (m.value / maxVal) * (chartHeight - 40) + paddingY;
    return { x, y, label: m.label, value: m.value };
  });

  const linePath = points.map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight + paddingY} L ${points[0].x} ${chartHeight + paddingY} Z` 
    : "";

  // Dynamic user name greeting
  const greetingName = user?.name || "An";

  // Dynamic trend rendering
  const trend = data.trendPercentage ?? 0;

  return (
    <div className="space-y-6 stagger">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-border gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            BẢNG ĐIỀU KHIỂN · GIÁM ĐỐC
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Xin chào, {greetingName}.
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Hôm nay có <span className="font-semibold text-primary">{data.activeRepairOrders} lệnh đang chạy</span>,{" "}
            <span className="font-semibold text-destructive">{data.lowStockCount} cảnh báo tồn kho</span>,{" "}
            <span className="font-semibold text-success">{data.newLeadsCount} lead mới</span>. KTV xuất sắc tuần này:{" "}
            <span className="font-bold text-primary">{topKtvName}</span>.
          </p>
        </div>
        <Link
          href="/workshop"
          className="gradient-primary text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-primary/20 shrink-0 w-full md:w-auto"
        >
          <Wrench size={16} /> Tạo lệnh sửa chữa
        </Link>
      </div>

      {/* Row of 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Lệnh đang chạy */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-orange-500 hover:-translate-y-0.5 transition-transform">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            LỆNH ĐANG CHẠY
          </p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight">
            {data.activeRepairOrders}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.waitingForPartsCount} chờ phụ tùng
          </p>
        </div>

        {/* Doanh thu 30 ngày */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            DOANH THU 30 NGÀY
          </p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight">
            {formatCurrency(data.revenue30Days)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.closedROsCount} lệnh đã đóng
          </p>
        </div>

        {/* Lead mới */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-amber-500 hover:-translate-y-0.5 transition-transform">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            LEAD MỚI
          </p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight">
            {data.newLeadsCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.pendingLeads} tổng pipeline
          </p>
        </div>

        {/* Cảnh báo tồn kho */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-zinc-500 hover:-translate-y-0.5 transition-transform">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            CẢNH BÁO TỒN KHO
          </p>
          <p className="text-4xl font-extrabold mt-2 tracking-tight">
            {data.lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dưới ngưỡng min
          </p>
        </div>
      </div>

      {/* Row with Chart and Top KTV */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doanh thu sửa chữa Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                DOANH THU SỬA CHỮA
              </p>
              <h3 className="text-xl font-bold tracking-tight mt-0.5">
                12 tháng gần nhất · triệu đồng
              </h3>
            </div>
            {trend >= 0 ? (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp size={12} /> +{trend}% so với kỳ trước
              </span>
            ) : (
              <span className="text-xs font-semibold text-rose-500 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                <TrendingDown size={12} /> {trend}% so với kỳ trước
              </span>
            )}
          </div>

          {/* SVG Area Chart */}
          <div className="w-full mt-6 relative overflow-x-auto min-w-[500px]">
            <svg viewBox="0 0 600 220" className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-color, #f97316)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary-color, #f97316)" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="560" y2="20" stroke="var(--border-color, #e4e4e7)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="40" y1="65" x2="560" y2="65" stroke="var(--border-color, #e4e4e7)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="40" y1="110" x2="560" y2="110" stroke="var(--border-color, #e4e4e7)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="40" y1="155" x2="560" y2="155" stroke="var(--border-color, #e4e4e7)" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="560" y2="180" stroke="var(--border-color, #e4e4e7)" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="30" y="24" textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{Math.round(maxVal)}</text>
              <text x="30" y="69" textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{Math.round(maxVal * 0.75)}</text>
              <text x="30" y="114" textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{Math.round(maxVal * 0.5)}</text>
              <text x="30" y="159" textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{Math.round(maxVal * 0.25)}</text>
              <text x="30" y="184" textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">0</text>

              {/* Chart Line and Area */}
              {points.length > 0 && (
                <>
                  <path d={areaPath} fill="url(#chart-grad)" />
                  <path d={linePath} fill="none" stroke="var(--primary-color, #f97316)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Glowing Points */}
                  {points.map((p: any, idx: number) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--primary-color, #f97316)" stroke="white" strokeWidth="1.5" />
                      <circle cx={p.x} cy={p.y} r="8" fill="var(--primary-color, #f97316)" fillOpacity="0" className="hover:fill-opacity-20 transition-all" />
                      <title>{p.label}: {p.value} triệu</title>
                    </g>
                  ))}
                </>
              )}

              {/* X Axis Labels */}
              {points.map((p: any, idx: number) => (
                <text key={idx} x={p.x} y="204" textAnchor="middle" className="text-[10px] fill-muted-foreground font-bold">
                  {p.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Top KTV tháng này */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              TOP KTV THÁNG NÀY
            </p>
            <h3 className="text-xl font-bold tracking-tight mt-0.5">
              Xếp hạng doanh số
            </h3>
          </div>

          <div className="space-y-4 mt-6 flex-1 flex flex-col justify-center">
            {(data.topKtv || []).map((tech: any, index: number) => (
              <div key={tech.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-primary text-white"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{tech.name}</p>
                    <p className="text-xs text-muted-foreground">{tech.completedOrders} lệnh đã đóng</p>
                  </div>
                </div>
                <span className="text-sm font-bold tracking-tight">
                  {formatCurrency(tech.totalRevenue)}
                </span>
              </div>
            ))}
            {(!data.topKtv || data.topKtv.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">Chưa có xếp hạng</p>
            )}
          </div>
        </div>
      </div>

      {/* Row with 3 Cards: RO queue, low stock, reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lệnh sửa chữa đang chờ xử lý */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  LỆNH SỬA CHỮA
                </p>
                <h4 className="text-lg font-bold tracking-tight mt-0.5">Đang chờ xử lý</h4>
              </div>
              <Link href="/workshop" className="text-xs font-semibold text-primary hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {(data.activeROList || []).map((ro: any) => (
                <div
                  key={ro.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 hover:bg-secondary/25 transition-colors border border-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Wrench size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold tracking-wide">
                        {formatRoCode(ro.id, ro.createdAt)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {ro.plateNumber} • {ro.customer?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full ${getStatusBadgeClass(ro.status)}`}>
                    {getStatusText(ro.status)}
                  </span>
                </div>
              ))}
              {(!data.activeROList || data.activeROList.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-12">
                  Mọi lệnh sửa chữa đã hoàn thành
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cảnh báo tồn kho */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  CẢNH BÁO TỒN KHÓ
                </p>
                <h4 className="text-lg font-bold tracking-tight mt-0.5">Dưới ngưỡng</h4>
              </div>
              <Link href="/inventory" className="text-xs font-semibold text-primary hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {(data.lowStockParts || []).slice(0, 5).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} className="text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                    {p.stockCount}/{p.stockMin}
                  </span>
                </div>
              ))}
              {(!data.lowStockParts || data.lowStockParts.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Mọi SKU đều ổn.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lịch chăm sóc sắp đến hạn */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  LỊCH CHĂM SÓC
                </p>
                <h4 className="text-lg font-bold tracking-tight mt-0.5">Sắp đến hạn</h4>
              </div>
              <Link href="/crm/reminders" className="text-xs font-semibold text-primary hover:underline">
                Xem tất cả
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {(data.careSchedules || []).map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 hover:bg-secondary/25 transition-colors border border-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                      <Calendar size={14} className="text-info" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{c.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.plateNumber} • {c.reminderType === "OIL_CHANGE" ? "Thay dầu" : c.reminderType}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(!data.careSchedules || data.careSchedules.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-12">
                  Không có lịch nhắc hẹn
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row of 5 small cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
        {/* TỔNG KH */}
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">TỔNG KH</span>
          </div>
          <p className="text-2xl font-black mt-3 tracking-tight">
            {data.totalCustomers}
          </p>
        </div>

        {/* KTV */}
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">KTV</span>
          </div>
          <p className="text-2xl font-black mt-3 tracking-tight">
            {data.totalTechnicians}
          </p>
        </div>

        {/* XE TỒN */}
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">XE TỒN</span>
          </div>
          <p className="text-2xl font-black mt-3 tracking-tight">
            {data.totalVehicles}
          </p>
        </div>

        {/* ZNS GỬI */}
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">ZNS GỬI</span>
          </div>
          <p className="text-2xl font-black mt-3 tracking-tight">
            {data.znsSentToday}
          </p>
        </div>

        {/* LỆNH HÔM NAY */}
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-border/60 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wrench size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">LỆNH HÔM NAY</span>
          </div>
          <p className="text-2xl font-black mt-3 tracking-tight">
            {data.roTodayCount}
          </p>
        </div>
      </div>
    </div>
  );
}
