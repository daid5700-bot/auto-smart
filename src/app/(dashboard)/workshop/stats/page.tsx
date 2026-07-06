"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatDate, fetchWithDedup } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Wrench, DollarSign, UserCog, TrendingUp,
  Settings, Loader2, RefreshCw, BarChart3,
  Calendar, Layers, Clock, ShieldCheck, X
} from "lucide-react";

export default function WorkshopStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");
  const lastStatsFetchKey = useRef<string | null>(null);
  const activeStatsRequestId = useRef(0);

  const LoadingScreen = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">Đang tải thống kê xưởng dịch vụ</p>
        <p className="text-xs text-muted-foreground mt-1">Vui lòng chờ trong giây lát...</p>
      </div>
    </div>
  );

  const fetchStats = async (force = false) => {
    let requestId = 0;
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const fetchKey = params.toString();
      if (!force && lastStatsFetchKey.current === fetchKey && (loading || data)) return;
      lastStatsFetchKey.current = fetchKey;
      requestId = activeStatsRequestId.current + 1;
      activeStatsRequestId.current = requestId;

      setLoading(true);
      setError(null);

      const d = await fetchWithDedup(`/api/stats/workshop?${params}`);
      if (activeStatsRequestId.current !== requestId) return;
      setData(d);
      setError(null);
    } catch (err: any) {
      if (activeStatsRequestId.current !== requestId) return;
      console.error(err);
      lastStatsFetchKey.current = null;
      const errMsg = err.message || "Không thể tải dữ liệu thống kê xưởng";
      setError(errMsg);
      toast.error("Lỗi tải thống kê", errMsg);
    } finally {
      if (activeStatsRequestId.current !== requestId) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const applyDateFilter = () => {
    if (!draftStartDate || !draftEndDate) {
      const msg = "Vui lòng chọn đầy đủ cả Từ ngày và Đến ngày.";
      toast.error(msg);
      return;
    }

    if (new Date(draftStartDate) > new Date(draftEndDate)) {
      const msg = "Từ ngày không được lớn hơn Đến ngày.";
      toast.error(msg);
      return;
    }

    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    toast.success(`Đã áp dụng bộ lọc từ ngày ${formatDate(draftStartDate)} đến ${formatDate(draftEndDate)}`);
  };

  const clearDateFilter = () => {
    setDraftStartDate("");
    setDraftEndDate("");
    setStartDate("");
    setEndDate("");
    toast.info("Đã xóa bộ lọc thời gian.");
  };

  if (loading && !data) return <LoadingScreen />;

  if (!loading && (error || !data)) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-semibold mb-4">
          Lỗi: {error || "Không thể tải dữ liệu thống kê dịch vụ"}
        </p>
        <button
          onClick={() => fetchStats(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  // Monthly trends chart data
  const monthlyTrends = data.monthlyTrends || [];
  const maxVal = Math.max(...monthlyTrends.map((m: any) => m.amount), 10);
  const chartHeight = 320;
  const chartWidth = 920;
  const paddingX = 40;
  const paddingY = 40;

  const points = monthlyTrends.map((m: any, index: number) => {
    const x = (index / Math.max(monthlyTrends.length - 1, 1)) * chartWidth + paddingX;
    const y = chartHeight - (m.amount / maxVal) * (chartHeight - 40) + paddingY;
    return { x, y, label: m.label, value: m.amount, count: m.count };
  });

  const linePath = points.map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight + paddingY} L ${points[0].x} ${chartHeight + paddingY} Z` 
    : "";

  return (
    <div className="space-y-6 stagger">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-5 border-b border-border flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Báo cáo thống kê
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Quản lý Xưởng Dịch vụ
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Time Filter Group */}
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold">
            <span className="text-muted-foreground">Từ ngày:</span>
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => {
                setDraftStartDate(e.target.value);
              }}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            <span className="text-muted-foreground border-l border-border pl-2">Đến:</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(e) => {
                setDraftEndDate(e.target.value);
              }}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            <button
              disabled={!draftStartDate || !draftEndDate}
              onClick={applyDateFilter}
              className="px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Áp dụng
            </button>
            <button
              disabled={!draftStartDate && !draftEndDate && !startDate && !endDate}
              onClick={clearDateFilter}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
              title="Xóa bộ lọc"
            >
              <X size={14} />
            </button>
          </div>

          <button
            onClick={() => fetchStats(true)}
            className="p-2.5 hover:bg-secondary rounded-xl text-primary border border-border bg-card transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Tổng doanh thu */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng doanh thu dịch vụ
            </p>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.revenue.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Lệnh đã hoàn thành & giao xe
          </p>
        </div>

        {/* Tiền công sửa chữa */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-blue-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Doanh thu tiền công (Labor)
            </p>
            <Wrench size={16} className="text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight text-blue-600 dark:text-blue-400">
            {formatCurrency(data.revenue.labor)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Chi phí nhân công thợ phụ trách
          </p>
        </div>

        {/* Doanh thu phụ tùng */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-purple-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Doanh thu vật tư (Parts)
            </p>
            <Layers size={16} className="text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight text-purple-600 dark:text-purple-400">
            {formatCurrency(data.revenue.parts)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Giá bán lẻ phụ tùng đã dùng
          </p>
        </div>

        {/* Lệnh đang hoạt động */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-orange-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Lệnh đang xử lý
            </p>
            <Clock size={16} className="text-orange-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight">
            {data.activeROs}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Chưa đóng / {data.totalROs} tổng lệnh dịch vụ
          </p>
        </div>
      </div>

      {/* Row with Monthly Trend Chart & Status breakdown */}
      <div className="grid grid-cols-1 gap-6">
        {/* Doanh thu sửa chữa chart */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Biểu đồ doanh thu
                </p>
                <h3 className="text-lg font-bold tracking-tight mt-0.5">
                  Xu hướng doanh thu dịch vụ sửa chữa (6 tháng gần nhất)
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp size={12} /> Doanh thu thực nhận
              </span>
            </div>
            
            <div className="w-full mt-6 relative overflow-x-auto min-w-[500px]">
              <svg viewBox={`0 0 ${chartWidth + paddingX * 2} ${chartHeight + paddingY * 2}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.00" />
                  </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = paddingY + 40 + (i / 4) * (chartHeight - 40);
                  return (
                    <line
                      key={i}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth + paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.08"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Fill Area */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#areaGrad)"
                  />
                )}

                {/* Line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Markers and tooltips */}
                {points.map((p: any, idx: number) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="rgb(59, 130, 246)"
                      stroke="var(--background)"
                      strokeWidth="2"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="10"
                      fill="rgb(59, 130, 246)"
                      fillOpacity="0"
                      className="hover:fill-opacity-10 transition-all duration-200"
                    />
                    <text
                      x={p.x}
                      y={p.y - 12}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    >
                      {formatCurrency(p.value)}
                    </text>
                    <text
                      x={p.x}
                      y={chartHeight + paddingY + 18}
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-muted-foreground"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Trạng thái sửa chữa */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-primary" />
              <h3 className="text-lg font-bold tracking-tight">Trạng thái lệnh</h3>
            </div>
            <div className="space-y-4">
              {data.statusCounts.map((col: any) => {
                const total = data.totalROs || 1;
                const percent = Math.min(Math.round((col.count / total) * 100), 100);
                
                const labelMap: Record<string, string> = {
                  PENDING: "Chờ tiếp nhận",
                  DIAGNOSING: "Chẩn đoán",
                  DOING: "Đang sửa",
                  WAITING_PARTS: "Chờ phụ tùng",
                  DONE: "Hoàn thành",
                  DELIVERED: "Đã giao xe",
                };

                return (
                  <div key={col.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{labelMap[col.status] || col.status}</span>
                      <span className="text-muted-foreground">{col.count} lệnh</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hiệu suất làm việc của Kỹ thuật viên */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={18} className="text-primary" />
          <h3 className="text-lg font-bold tracking-tight">Hiệu suất Kỹ thuật viên</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/10">
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground">Kỹ thuật viên</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground">Trạng thái</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-right">Số lệnh hoàn thành</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-right">Doanh thu tiền công</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-right">Doanh thu phụ tùng</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-right">Tổng doanh thu phụ trách</th>
              </tr>
            </thead>
            <tbody>
              {data.technicianPerformance.map((tech: any) => (
                <tr key={tech.id} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{tech.name}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                      tech.status === "WORKING" 
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    }`}>
                      {tech.status === "WORKING" ? "Đang làm việc" : "Đang rảnh"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-primary">{tech.completedCount}</td>
                  <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(tech.laborRevenue)}</td>
                  <td className="p-3 text-right font-medium text-foreground/80">{formatCurrency(tech.partsRevenue)}</td>
                  <td className="p-3 text-right font-extrabold text-foreground">{formatCurrency(tech.totalRevenue)}</td>
                </tr>
              ))}
              {data.technicianPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                    Chưa có kỹ thuật viên nào đảm nhận lệnh sửa chữa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
