"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, statusText, statusBadge } from "@/lib/utils";
import {
  Car, DollarSign, CheckCircle, TrendingUp, TrendingDown,
  ArrowUpRight, Clock, Banknote, ShieldCheck,
  Loader2, RefreshCw
} from "lucide-react";

export default function SalesStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/stats/sales");
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
  }, []);

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
  const chartHeight = 320;
  const chartWidth = 920;
  const paddingX = 40;
  const paddingY = 40;

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
      <div className="flex items-center justify-between pb-5 border-b border-border">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Báo cáo thống kê
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Kinh doanh & Bán Xe
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Theo dõi tổng quan xe sẵn có, doanh thu dự kiến và xe đã bán.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2.5 hover:bg-secondary rounded-xl text-primary border border-border bg-card transition-colors"
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Xe sẵn có */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-blue-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Xe sẵn có
            </p>
            <Car size={16} className="text-blue-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight">
            {data.availableVehicles}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Đang nằm tại showroom
          </p>
        </div>

        {/* Tổng giá trị xe */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-primary hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Giá trị tồn kho xe
            </p>
            <DollarSign size={16} className="text-primary" />
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight text-primary">
            {formatCurrency(data.inventoryValue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Dựa trên giá niêm yết
          </p>
        </div>

        {/* Đã bán */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Xe đã bán
            </p>
            <CheckCircle size={16} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight text-emerald-600 dark:text-emerald-400">
            {data.soldVehicles}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Giao dịch thành công
          </p>
        </div>

        {/* Đặt cọc */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-amber-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Đang đặt cọc
            </p>
            <Banknote size={16} className="text-amber-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight text-amber-600 dark:text-amber-400">
            {data.reservedVehicles}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Chờ thanh toán / xuất hóa đơn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-8">
        {/* Biểu đồ xu hướng */}
        <div className="border border-border bg-card shadow-sm rounded-xl overflow-hidden flex flex-col justify-between p-6">
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

        {/* Recent Added Vehicles */}
        <div className="border border-border bg-card shadow-sm rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-secondary/10">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-muted-foreground" />
              <h3 className="font-bold text-base">Xe mới thêm gần đây</h3>
            </div>
            <Link href="/sales" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Xem toàn bộ <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="flex-1 p-0">
            {data.recentVehicles?.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentVehicles.map((v: any) => (
                  <div key={v.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      {v.image ? (
                        <img src={v.image} alt={v.model} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center shrink-0">
                          <Car size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm">{v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.variant} • VIN: {v.vin?.slice(-6)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(Number(v.listPrice))}</p>
                      <div className="mt-1">
                        <span className={`badge ${statusBadge(v.status)} text-[10px] px-2 py-0.5`}>
                          {statusText(v.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Chưa có dữ liệu xe mới
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
