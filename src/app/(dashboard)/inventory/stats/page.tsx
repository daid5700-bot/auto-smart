"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  Package, DollarSign, AlertTriangle, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Boxes, PieChart,
  Loader2, RefreshCw
} from "lucide-react";

export default function InventoryStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/stats/inventory");
      if (!res.ok) throw new Error("Failed to load inventory statistics");
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
          Lỗi: {error || "Không thể tải dữ liệu thống kê kho"}
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
          <p className="text-sm text-muted-foreground mt-1.5">
            Theo dõi tổng quan giá trị tồn kho, các mặt hàng sắp hết và lịch sử luân chuyển vật tư.
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
        {/* Tổng mặt hàng */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-blue-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng số phụ tùng
            </p>
            <Package size={16} className="text-blue-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight">
            {data.totalProducts}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Loại phụ tùng khác nhau
          </p>
        </div>

        {/* Tổng tồn kho */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-purple-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng số lượng tồn
            </p>
            <Boxes size={16} className="text-purple-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight">
            {data.totalStock}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Đơn vị sản phẩm hiện có
          </p>
        </div>

        {/* Tổng giá trị kho */}
        <div className="glass-card rounded-xl p-5 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tổng giá trị tồn
            </p>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold mt-3.5 tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totalValuation)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Tính theo giá bán lẻ (Retail)
          </p>
        </div>

        {/* Cảnh báo hết hàng */}
        <Link href="/inventory?filter=low" className="glass-card rounded-xl p-5 border-l-4 border-l-rose-500 hover:-translate-y-0.5 transition-transform block">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Cảnh báo tồn kho
            </p>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <p className="text-4xl font-extrabold mt-3 tracking-tight text-rose-600 dark:text-rose-400">
            {data.lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Phụ tùng chạm/dưới mức tối thiểu
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
                  <th>Mã phụ tùng</th>
                  <th>Tên phụ tùng</th>
                  <th className="text-right">Tồn kho</th>
                  <th className="text-right">Tối thiểu</th>
                  <th className="text-right">Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item: any) => (
                  <tr key={item.id}>
                    <td><span className="font-mono text-xs font-semibold">{item.sku}</span></td>
                    <td className="font-medium">{item.name}</td>
                    <td className="text-right text-rose-600 font-bold">{item.stockCount} {item.unit}</td>
                    <td className="text-right text-muted-foreground">{item.stockMin} {item.unit}</td>
                    <td className="text-right font-semibold">{formatCurrency(item.price)}</td>
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
                <th>Loại giao dịch</th>
                <th>Mã phụ tùng</th>
                <th>Tên phụ tùng</th>
                <th className="text-right">Số lượng</th>
                <th className="text-right">Đơn giá</th>
                <th>Đơn vị tính</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMovements.map((mov: any) => (
                <tr key={mov.id}>
                  <td>
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
                  <td><span className="font-mono text-xs">{mov.product?.sku}</span></td>
                  <td className="font-medium text-xs max-w-sm truncate">{mov.product?.name}</td>
                  <td className="text-right font-bold">{mov.quantity}</td>
                  <td className="text-right font-medium">{formatCurrency(Number(mov.unitCost))}</td>
                  <td><span className="text-muted-foreground text-xs">{mov.product?.unit}</span></td>
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
