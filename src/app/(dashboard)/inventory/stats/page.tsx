"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Package, DollarSign, AlertTriangle, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Boxes, PieChart,
  Loader2, RefreshCw, X, Sparkles
} from "lucide-react";

export default function InventoryStatsPage() {
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
        <p className="text-sm font-bold text-foreground">Đang tải thống kê kho</p>
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

      const res = await fetch(`/api/stats/inventory?${params}`);
      if (!res.ok) throw new Error("Failed to load inventory statistics");
      const d = await res.json();
      if (activeStatsRequestId.current !== requestId) return;
      setData(d);
      setError(null);
    } catch (err: any) {
      if (activeStatsRequestId.current !== requestId) return;
      console.error(err);
      lastStatsFetchKey.current = null;
      const errMsg = err.message || "Không thể tải dữ liệu thống kê kho";
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
          Lỗi: {error || "Không thể tải dữ liệu thống kê kho"}
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

  return (
    <div className="space-y-6 stagger">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-5 border-b border-border">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Báo cáo thống kê
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Quản lý Kho Phụ tùng
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

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng mặt hàng */}
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-blue-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Tổng số phụ tùng
            </p>
            <Package size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">
            {data.totalProducts}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Loại phụ tùng khác nhau
          </p>
        </div>

        {/* Tổng tồn kho */}
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-purple-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Tổng số lượng tồn
            </p>
            <Boxes size={14} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">
            {data.totalStock}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Đơn vị sản phẩm hiện có
          </p>
        </div>

        {/* Tổng giá trị kho */}
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Tổng giá trị tồn
            </p>
            <DollarSign size={14} className="text-emerald-500" />
          </div>
          <p className="text-lg font-black mt-2.5 tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(data.totalValuation)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Theo giá bán lẻ (Retail)
          </p>
        </div>

        {/* Cảnh báo hết hàng */}
        <Link href="/inventory?filter=low" className="glass-card rounded-xl p-4 border-l-4 border-l-rose-500 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Cảnh báo tồn kho
            </p>
            <AlertTriangle size={14} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-rose-600 dark:text-rose-400">
            {data.lowStockCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Chạm/dưới mức tối thiểu
          </p>
        </Link>

        {/* Tổng đã bán */}
        <Link 
          href="/inventory/history?tab=EXPORT"
          className="glass-card rounded-xl p-4 border-l-4 border-l-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
              Tổng đã bán
            </p>
            <ArrowUpRight size={14} className="text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-indigo-600 dark:text-indigo-400">
            {data.totalSoldQty || 0}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tổng sản phẩm đã xuất (Click xem chi tiết)
          </p>
        </Link>

        {/* Tổng giá trị bán */}
        <Link 
          href="/inventory/history?tab=EXPORT"
          className="glass-card rounded-xl p-4 border-l-4 border-l-amber-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-amber-500 transition-colors">
              Tổng giá trị bán
            </p>
            <TrendingUp size={14} className="text-amber-500 group-hover:scale-105 transition-transform" />
          </div>
          <p className="text-lg font-black mt-2.5 tracking-tight text-amber-600 dark:text-amber-400 truncate">
            {formatCurrency(data.totalSoldAmount || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Theo giá bán lẻ (Click xem chi tiết)
          </p>
        </Link>

        {/* Tổng quà tặng đã xuất */}
        <Link 
          href="/inventory/history?tab=EXPORT"
          className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-emerald-500 transition-colors">
              Tổng quà tặng
            </p>
            <Sparkles size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400">
            {data.totalGiftQty || 0}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tổng sản phẩm tặng (Click xem chi tiết)
          </p>
        </Link>

        {/* Tổng giá trị quà tặng */}
        <Link 
          href="/inventory/history?tab=EXPORT"
          className="glass-card rounded-xl p-4 border-l-4 border-l-teal-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/5 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-teal-500 transition-colors">
              Trị giá quà tặng
            </p>
            <TrendingUp size={14} className="text-teal-500 group-hover:scale-105 transition-transform" />
          </div>
          <p className="text-lg font-black mt-2.5 tracking-tight text-teal-600 dark:text-teal-400 truncate">
            {formatCurrency(data.totalGiftAmount || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tổng trị giá quà tặng đã phát (Click xem chi tiết)
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phân bổ theo danh mục */}
        <div className="lg:col-span-1 glass-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={18} className="text-primary" />
              <h3 className="text-lg font-bold tracking-tight">Cơ cấu danh mục</h3>
            </div>
            <div className="space-y-4">
              {data.categories.map((cat: any) => {
                const totalVal = data.totalValuation || 1;
                const percent = Math.min(Math.round((cat.value / totalVal) * 100), 100);
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{cat.name}</span>
                      <span className="text-muted-foreground">
                        {cat.count} loại ({formatCurrency(cat.value)})
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
              {data.categories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-12">Không có dữ liệu danh mục</p>
              )}
            </div>
          </div>
        </div>

        {/* Phụ tùng cần nhập thêm (Sắp hết hàng) */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" />
              <h3 className="text-lg font-bold tracking-tight">Phụ tùng cần bổ sung gấp</h3>
            </div>
            <span className="text-xs text-rose-500 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Dưới mức tối thiểu
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="!text-center">Mã phụ tùng</th>
                  <th className="!text-center">Tên phụ tùng</th>
                  <th className="!text-center">Tồn kho</th>
                  <th className="!text-center">Tối thiểu</th>
                  <th className="!text-center">Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item: any) => (
                  <tr key={item.id}>
                    <td className="text-center"><span className="font-mono text-xs font-semibold">{item.sku}</span></td>
                    <td className="font-medium text-center">{item.name}</td>
                    <td className="text-center text-rose-600 font-bold">{item.stockCount} {item.unit}</td>
                    <td className="text-center text-muted-foreground">{item.stockMin} {item.unit}</td>
                    <td className="text-center font-semibold">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
                {data.lowStockItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                      Tồn kho ở trạng thái an toàn. Không có phụ tùng nào sắp hết!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lịch sử giao dịch nhập/xuất kho gần đây */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="text-lg font-bold tracking-tight">Giao dịch kho gần đây</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="!text-center">Loại giao dịch</th>
                <th className="!text-center">Mã phụ tùng</th>
                <th className="!text-center">Tên phụ tùng</th>
                <th className="!text-center">Số lượng</th>
                <th className="!text-center">Đơn vị tính</th>
                <th className="!text-center">Đơn giá</th>
                <th className="!text-center">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMovements.map((mov: any) => (
                <tr key={mov.id}>
                  <td className="text-center">
                    {mov.type === "IMPORT" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ArrowDownLeft size={10} /> Nhập kho
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        <ArrowUpRight size={10} /> Xuất kho
                      </span>
                    )}
                  </td>
                  <td className="text-center"><span className="font-mono text-xs">{mov.product?.sku}</span></td>
                  <td className="font-medium text-xs max-w-sm truncate text-center">
                    <Link
                      href={`/inventory/history?movementId=${mov.id}&tab=${mov.type === "IMPORT" ? "IMPORT" : "EXPORT"}`}
                      className="hover:text-primary hover:underline font-medium block text-foreground"
                    >
                      {mov.product?.name}
                    </Link>
                  </td>
                  <td className="text-center font-bold">{mov.quantity}</td>
                  <td className="text-center"><span className="text-muted-foreground text-xs">{mov.product?.unit}</span></td>
                  <td className="text-center font-medium text-muted-foreground">{formatCurrency(Number(mov.unitCost))}</td>
                  <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(mov.unitCost) * mov.quantity)}</td>
                </tr>
              ))}
              {data.recentMovements.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                    Chưa có giao dịch nhập/xuất kho nào được ghi nhận.
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
