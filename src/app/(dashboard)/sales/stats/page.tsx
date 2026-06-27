"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Car, DollarSign, CheckCircle, TrendingUp, TrendingDown,
  ArrowUpRight, Clock, Banknote, ShieldCheck,
  Loader2, RefreshCw, X, Calendar, User, Tag
} from "lucide-react";

export default function SalesStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/stats/sales?${params}`);
      if (!res.ok) throw new Error("Failed to load sales statistics");
      const d = await res.json();
      setData(d);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-semibold mb-4">
          Lỗi: {error || "Không thể tải dữ liệu thống kê kinh doanh"}
        </p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  // Calculate SVG chart coordinates
  const monthlySales = data.monthlySales || [];
  const maxVal = Math.max(...monthlySales.map((r: any) => r.value), 10);
  const chartHeight = 240;
  const chartWidth = 920;
  const paddingX = 40;
  const paddingY = 20;

  const points = monthlySales.map((m: any, index: number) => {
    const x = (index / 11) * chartWidth + paddingX;
    const y = chartHeight - (m.value / maxVal) * (chartHeight - 40) + paddingY;
    return { x, y, label: m.label, value: m.value };
  });

  const linePath = points.map((p: any, idx: number) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight + paddingY} L ${points[0].x} ${chartHeight + paddingY} Z` 
    : "";

  const trend = data.trendPercentage ?? 0;

  return (
    <div className="space-y-6 stagger">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-5 border-b border-border flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Báo cáo thống kê
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Kinh doanh & Bán Xe
          </h2>
          </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Time Filter Group */}
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold">
            <span className="text-muted-foreground">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            <span className="text-muted-foreground border-l border-border pl-2">Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                title="Xóa bộ lọc"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={fetchStats}
            className="p-2.5 hover:bg-secondary rounded-xl text-primary border border-border bg-card transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Đã bán */}
        <div className="glass-card rounded-xl p-6 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Số xe đã bán
            </p>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-bold mt-3 tracking-tight text-emerald-600 dark:text-emerald-400">
            {data.soldVehicles}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Giao dịch bàn bàn giao xe thành công
          </p>
        </div>

        {/* Tổng giá trị bán */}
        <div className="glass-card rounded-xl p-6 border-l-4 border-l-primary hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng giá trị bán
            </p>
            <DollarSign size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-bold mt-3 tracking-tight text-primary">
            {formatCurrency(data.soldValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Doanh thu cộng dồn từ xe đã bán
          </p>
        </div>

        {/* Đơn giá trung bình / xe */}
        <div className="glass-card rounded-xl p-6 border-l-4 border-l-purple-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Đơn giá trung bình
            </p>
            <TrendingUp size={18} className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold mt-3 tracking-tight text-purple-600 dark:text-purple-400">
            {formatCurrency(data.avgPrice)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Giá bán bình quân trên mỗi xe
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Trend chart & Sold list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biểu đồ xu hướng */}
          <div className="border border-border bg-card shadow-sm rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  XU HƯỚNG BÁN XE (12 THÁNG)
                </p>
                <h3 className="text-xl font-bold tracking-tight mt-0.5">
                  Số xe chốt sales
                </h3>
              </div>
              {trend >= 0 ? (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <TrendingUp size={12} /> +{trend}%
                </span>
              ) : (
                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                  <TrendingDown size={12} /> {trend}%
                </span>
              )}
            </div>

            {/* SVG Area Chart */}
            <div className="w-full mt-6 relative overflow-x-auto min-w-[500px]">
              <svg viewBox={`0 0 ${chartWidth + paddingX * 2} ${chartHeight + paddingY * 2}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color, #10b981)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--primary-color, #10b981)" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = paddingY + 40 + (i / 4) * (chartHeight - 40);
                  return (
                    <line key={i} x1={paddingX} y1={y} x2={chartWidth + paddingX} y2={y} stroke="var(--border-color, #e4e4e7)" strokeWidth={i === 4 ? 1 : 0.5} strokeDasharray={i === 4 ? "" : "3 3"} />
                  );
                })}

                {/* Y Axis Labels */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = paddingY + 40 + (i / 4) * (chartHeight - 40) + 4;
                  const val = Math.round(maxVal * (1 - i / 4));
                  return (
                    <text key={i} x="30" y={y} textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{val}</text>
                  );
                })}

                {/* Chart Line and Area */}
                {points.length > 0 && (
                  <>
                    <path d={areaPath} fill="url(#chart-grad)" />
                    <path d={linePath} fill="none" stroke="var(--primary-color, #10b981)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Glowing Points */}
                    {points.map((p: any, idx: number) => (
                      <g key={idx} className="group cursor-pointer">
                        <circle cx={p.x} cy={p.y} r="4" fill="var(--primary-color, #10b981)" stroke="white" strokeWidth="1.5" />
                        <circle cx={p.x} cy={p.y} r="8" fill="var(--primary-color, #10b981)" fillOpacity="0" className="hover:fill-opacity-20 transition-all" />
                        <title>{p.label}: {p.value} xe</title>
                      </g>
                    ))}
                  </>
                )}

                {/* X Axis Labels */}
                {points.map((p: any, idx: number) => (
                  <text key={idx} x={p.x} y={chartHeight + paddingY + 12} textAnchor="middle" className="text-[10px] fill-muted-foreground font-bold">
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Hóa đơn / Danh sách xe đã bán */}
          <div className="border border-border bg-card shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4.5 border-b border-border bg-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <h3 className="font-bold text-sm">Danh sách xe đã bán ra</h3>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                {data.soldList?.length || 0} Giao dịch
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20 text-muted-foreground font-bold">
                    <th className="p-3 w-10 text-center">STT</th>
                    <th className="p-3">Xe & Phiên bản</th>
                    <th className="p-3">Số VIN</th>
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3 text-right">Giá trị bán</th>
                    <th className="p-3 text-center">Ngày bàn giao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.soldList?.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="p-3 text-center text-muted-foreground font-semibold">{idx + 1}</td>
                      <td className="p-3 font-bold text-foreground">
                        {item.model}
                        {item.variant && <span className="text-[10px] text-muted-foreground block font-normal">{item.variant} • {item.color || "N/A"}</span>}
                      </td>
                      <td className="p-3 font-mono font-bold text-muted-foreground">{item.vin?.slice(-6) || "N/A"}</td>
                      <td className="p-3">
                        {item.customer ? (
                          <div>
                            <span className="font-semibold block">{item.customer.name}</span>
                            <span className="text-[10px] text-muted-foreground block">{item.customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Vãng lai</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(item.listPrice))}
                      </td>
                      <td className="p-3 text-center text-muted-foreground font-medium">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                  {(!data.soldList || data.soldList.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                        Không có dữ liệu xe đã bán trong khoảng thời gian này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Best selling models structure */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tag size={18} className="text-primary" />
                <h3 className="text-lg font-bold tracking-tight">Cơ cấu dòng xe bán chạy</h3>
              </div>
              <div className="space-y-5">
                {data.topModels?.map((item: any) => {
                  const totalVal = Number(data.soldValue) || 1;
                  const percent = Math.min(Math.round((item.value / totalVal) * 100), 100);
                  return (
                    <div key={item.model} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{item.model}</span>
                        <span className="text-muted-foreground font-semibold">
                          {item.count} xe ({formatCurrency(item.value)})
                        </span>
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
                {(!data.topModels || data.topModels.length === 0) && (
                  <div className="text-center text-muted-foreground text-sm italic py-8">
                    Chưa có cơ cấu bán hàng
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
