"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Package, DollarSign, AlertTriangle, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Boxes, PieChart,
  Loader2, RefreshCw, X
} from "lucide-react";

export default function InventoryStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const groupMovementsIntoReceipts = (movements: any[]) => {
    const groups: Record<string, {
      id: string;
      type: string;
      createdBy: string;
      createdAt: string;
      reason: string;
      items: any[];
      totalAmount: number;
    }> = {};

    movements.forEach(m => {
      const dateVal = new Date(m.createdAt).getTime();
      const timeWindow = Math.floor(dateVal / 3000);
      const key = `${m.type}-${m.createdBy}-${timeWindow}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          type: m.type,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          reason: m.reason || "",
          items: [],
          totalAmount: 0
        };
      }
      
      groups[key].items.push(m);
      groups[key].totalAmount += Number(m.quantity * (m.product?.price || 0));
    });

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getReceiptCode = (type: string, dateStr: string) => {
    const cleanDate = dateStr.replace(/\D/g, "").slice(2, 12);
    const prefix = type === "IMPORT" ? "PN" : type === "EXPORT" ? "PX" : "PK";
    return `${prefix}-${cleanDate}`;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/stats/inventory?${params}`);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        <div 
          onClick={() => setShowInvoicesModal(true)}
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
        </div>

        {/* Tổng giá trị bán */}
        <div 
          onClick={() => setShowInvoicesModal(true)}
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
        </div>
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

      {/* INVOICES MODAL */}
      {showInvoicesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary/10">
              <div>
                <h3 className="text-base font-bold text-foreground">Hóa đơn bán lẻ & Phiếu xuất kho</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {startDate || endDate ? `Thời gian: ${startDate || "..."} đến ${endDate || "..."}` : "Tất cả thời gian"}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowInvoicesModal(false);
                  setSelectedReceipt(null);
                }}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* If a specific receipt is clicked, show its printable details */}
              {selectedReceipt ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline mb-2"
                  >
                    &larr; Quay lại danh sách hóa đơn
                  </button>

                  <div className="p-6 bg-white text-zinc-950 rounded-xl border border-zinc-200 space-y-6">
                    {/* Printable area content */}
                    <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
                      <div>
                        <h4 className="text-lg font-black tracking-tight text-primary">AUTO-SMART</h4>
                        <p className="text-[10px] text-zinc-500">Hệ thống quản lý thông minh</p>
                      </div>
                      <div className="text-right">
                        <h4 className="text-sm font-bold uppercase text-zinc-700">PHIẾU XUẤT KHO / HÓA ĐƠN</h4>
                        <p className="font-mono font-bold text-xs text-zinc-800">
                          Số: {getReceiptCode(selectedReceipt.type, selectedReceipt.createdAt)}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Ngày lập: {formatDate(selectedReceipt.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-zinc-605 bg-zinc-50 p-3 rounded-lg">
                      <div>
                        <p><span className="font-bold text-zinc-800">Người xuất:</span> {selectedReceipt.createdBy}</p>
                      </div>
                      <div>
                        <p><span className="font-bold text-zinc-800">Ghi chú:</span> {selectedReceipt.reason || "—"}</p>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-zinc-250 text-zinc-850 font-bold">
                          <th className="py-2 w-8">STT</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2">Tên phụ tùng</th>
                          <th className="py-2 text-center w-16">SL</th>
                          <th className="py-2 text-center w-16">ĐVT</th>
                          <th className="py-2 text-right w-24">Đơn giá</th>
                          <th className="py-2 text-right w-24">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {selectedReceipt.items.map((m: any, idx: number) => {
                          const itemTotal = m.quantity * (m.product?.price || 0);
                          return (
                            <tr key={m.id} className="text-zinc-700">
                              <td className="py-2">{idx + 1}</td>
                              <td className="py-2 font-mono font-bold text-zinc-800">{m.product?.sku}</td>
                              <td className="py-2">{m.product?.name}</td>
                              <td className="py-2 text-center">{m.quantity}</td>
                              <td className="py-2 text-center">{m.product?.unit}</td>
                              <td className="py-2 text-right">{formatCurrency(m.product?.price || 0)}</td>
                              <td className="py-2 text-right font-semibold text-zinc-950">{formatCurrency(itemTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="border-t border-zinc-200 pt-4 flex justify-between items-center">
                      <div className="text-[10px] text-zinc-400 italic">
                        * Giá bán lẻ tại quầy đã bao gồm thuế.
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 font-bold uppercase mr-4">Tổng tiền:</span>
                        <span className="text-base font-black text-zinc-950">{formatCurrency(selectedReceipt.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-secondary/40 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Mã hóa đơn</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Thời gian</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Người bán</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-center">Số mặt hàng</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-right">Tổng giá trị</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Ghi chú</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-center">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {groupMovementsIntoReceipts(data.exports || []).map((r: any) => {
                        const receiptCode = getReceiptCode(r.type, r.createdAt);
                        return (
                          <tr key={r.id} className="hover:bg-primary/[0.02]">
                            <td className="px-4 py-3 font-mono font-bold text-primary text-xs">{receiptCode}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {formatDate(r.createdAt)} {new Date(r.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 font-medium text-xs">{r.createdBy}</td>
                            <td className="px-4 py-3 text-center font-semibold text-xs">{r.items.length}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground text-xs">
                              {formatCurrency(r.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[150px]">{r.reason || "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setSelectedReceipt(r)}
                                className="px-2.5 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-white transition-all font-semibold text-xs"
                              >
                                Xem chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {(data.exports || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                            Không tìm thấy hóa đơn nào trong khoảng thời gian này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/15 flex justify-end">
              <button
                onClick={() => {
                  setShowInvoicesModal(false);
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 bg-secondary border border-border text-foreground rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
