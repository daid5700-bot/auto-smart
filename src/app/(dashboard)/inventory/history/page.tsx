"use client";

import { useEffect, useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, DollarSign, X, Edit3, Eye, Search } from "lucide-react";

export default function InventoryHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Payment update modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [paymentInput, setPaymentInput] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const groupMovementsIntoReceipts = (movements: any[]) => {
    const groups: Record<string, {
      id: string;
      type: string;
      createdBy: string;
      createdAt: string;
      reason: string;
      items: any[];
      totalAmount: number;
      inventoryOrder: any;
    }> = {};

    movements.forEach(m => {
      let key = "";
      if (m.inventoryOrder) {
        key = `ORDER-${m.inventoryOrder.id}`;
      } else {
        const dateVal = new Date(m.createdAt).getTime();
        const timeWindow = Math.floor(dateVal / 3000);
        key = `${m.type}-${m.createdBy}-${timeWindow}`;
      }
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          type: m.type,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          reason: m.reason || "",
          items: [],
          totalAmount: 0,
          inventoryOrder: m.inventoryOrder || null
        };
      }
      
      groups[key].items.push(m);
      groups[key].totalAmount += Number(m.totalCost || 0);
    });

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getReceiptCode = (type: string, dateStr: string) => {
    const cleanDate = dateStr.replace(/\D/g, "").slice(2, 12);
    const prefix = type === "IMPORT" ? "PN" : type === "EXPORT" ? "PX" : "PK";
    return `${prefix}-${cleanDate}`;
  };

  const fetchMovements = async (p: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/movements?page=${p}&limit=50&search=${encodeURIComponent(debouncedSearch)}`);
      const data = await res.json();
      setHistory(data.movements || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error("Lỗi tải lịch sử kho:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements(currentPage);
  }, [currentPage, debouncedSearch]);

  const groupedReceipts = useMemo(() => groupMovementsIntoReceipts(history), [history]);

  const filteredReceipts = useMemo(() => {
    if (activeTab === "ALL") return groupedReceipts;
    return groupedReceipts.filter(r => r.type === activeTab);
  }, [groupedReceipts, activeTab]);

  const importCount = groupedReceipts.filter(r => r.type === "IMPORT").length;
  const exportCount = groupedReceipts.filter(r => r.type === "EXPORT").length;
  const allCount = groupedReceipts.length;

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPayment || !paymentInput) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/inventory/orders/${selectedOrderForPayment.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: Number(paymentInput) }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        fetchMovements(currentPage);
      } else {
        const err = await res.json();
        alert("Lỗi: " + err.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="mx-auto space-y-6 stagger">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
          PHÒNG PHỤ TÙNG
        </p>
        <h2 className="text-3xl font-black tracking-tight">Lịch sử phiếu kho</h2>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-border mb-4 mt-2">
        <button 
          onClick={() => setActiveTab("ALL")} 
          className={`px-5 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "ALL" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Tất cả <span className={`text-[10px] min-w-[20px] h-[20px] flex items-center justify-center px-1.5 rounded-full font-bold ${activeTab === "ALL" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{allCount}</span>
        </button>
        <button 
          onClick={() => setActiveTab("IMPORT")} 
          className={`px-5 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "IMPORT" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Phiếu Nhập <span className={`text-[10px] min-w-[20px] h-[20px] flex items-center justify-center px-1.5 rounded-full font-bold ${activeTab === "IMPORT" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{importCount}</span>
        </button>
        <button 
          onClick={() => setActiveTab("EXPORT")} 
          className={`px-5 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === "EXPORT" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Phiếu Xuất <span className={`text-[10px] min-w-[20px] h-[20px] flex items-center justify-center px-1.5 rounded-full font-bold ${activeTab === "EXPORT" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{exportCount}</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Tìm theo khách hàng, SĐT, ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </div>
      </div>

      <div className="border border-border bg-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Khách hàng</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">SĐT</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Loại phiếu</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Người lập</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng tiền</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nợ</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    Chưa có lịch sử giao dịch nào.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r: any) => {
                  const receiptCode = getReceiptCode(r.type, r.createdAt);
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedReceipt(r)}
                      className="hover:bg-primary/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-xs">
                        {r.inventoryOrder?.customer ? (
                          <span className="font-bold text-primary truncate block max-w-[150px]">{r.inventoryOrder.customer.name}</span>
                        ) : r.inventoryOrder ? (
                          <span className="italic text-muted-foreground">Khách vô danh</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.inventoryOrder?.customer ? (
                          <span className="font-mono">{r.inventoryOrder.customer.phone}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">{formatDate(r.createdAt)}</div>
                        <div className="text-[10px]">{new Date(r.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 uppercase rounded-md ${
                          r.type === "IMPORT" ? "bg-primary/10 text-primary" :
                          r.type === "EXPORT" ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" :
                          "bg-amber-500/10 text-amber-500"
                        }`}>
                          {r.type === "IMPORT" ? "Nhập kho" : r.type === "EXPORT" ? "Xuất kho" : "Kiểm kê"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{r.createdBy}</td>
                      <td className="px-4 py-3 text-xs font-bold text-foreground">
                        {r.inventoryOrder ? formatCurrency(r.inventoryOrder.totalAmount) : formatCurrency(r.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.inventoryOrder ? (
                          <div className="space-y-0.5">
                            <div className="text-emerald-600 font-semibold">Đã trả: {formatCurrency(Number(r.inventoryOrder.paidAmount))}</div>
                            <div className="text-rose-600 font-semibold">Còn nợ: {formatCurrency(Number(r.inventoryOrder.debtAmount))}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">{r.reason || "—"}</td>
                      <td className="px-4 py-3 text-xs text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(r)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-primary transition-colors"
                            title="Chi tiết"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <div className="text-xs text-muted-foreground">
              Trang <span className="font-semibold text-foreground">{currentPage}</span> / <span className="font-semibold text-foreground">{totalPages}</span>
            </div>
            <div className="flex gap-1 items-center">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECEIPT DETAIL MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 print:p-0">
          <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:border-none print:shadow-none print:w-full print:max-h-full print:rounded-none">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary/10 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Chi tiết giao dịch</span>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Invoice Printable Area */}
            <div className="p-8 flex-1 overflow-y-auto print:overflow-visible space-y-6 bg-white text-zinc-900" id="printable-receipt">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-primary">AUTO-SMART CRM & ERP</h1>
                  <p className="text-xs text-zinc-500 mt-1">Hệ thống quản trị doanh nghiệp ô tô thông minh</p>
                  <p className="text-xs text-zinc-400">Chi nhánh: Mặc định</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-700">
                    {selectedReceipt.type === "IMPORT" ? "PHIẾU NHẬP KHO" : 
                     selectedReceipt.type === "EXPORT" ? "PHIẾU XUẤT KHO" : "BIÊN BẢN KIỂM KÊ"}
                  </h2>
                  <p className="font-mono font-bold text-xs text-zinc-800 mt-1">
                    Số: {getReceiptCode(selectedReceipt.type, selectedReceipt.createdAt)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Ngày lập: {formatDate(selectedReceipt.createdAt)}
                  </p>
                </div>
              </div>

              {/* Invoice Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs text-zinc-600 bg-zinc-50 p-4 rounded-xl">
                <div>
                  <p><span className="font-bold text-zinc-800">Người lập phiếu:</span> {selectedReceipt.createdBy}</p>
                  <p className="mt-1"><span className="font-bold text-zinc-800">Bộ phận:</span> Phòng phụ tùng / Kho hàng</p>
                </div>
                <div>
                  <p><span className="font-bold text-zinc-800">Hình thức:</span> {
                    selectedReceipt.type === "IMPORT" ? "Nhập tay (Manual)" : 
                    selectedReceipt.type === "EXPORT" ? "Xuất kho trực tiếp" : "Kiểm kê định kỳ"
                  }</p>
                  <p className="mt-1"><span className="font-bold text-zinc-800">Ghi chú:</span> {selectedReceipt.reason || "—"}</p>
                </div>
              </div>

              {/* Invoice Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300 text-zinc-850 font-bold">
                    <th className="py-2.5 w-10">STT</th>
                    <th className="py-2.5">Mã SKU</th>
                    <th className="py-2.5">Tên sản phẩm / phụ tùng</th>
                    <th className="py-2.5 text-center w-20">Số lượng</th>
                    <th className="py-2.5 text-center w-16">Đơn vị</th>
                    {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
                      <>
                        <th className="py-2.5 text-right w-28">Đơn giá</th>
                        <th className="py-2.5 text-right w-28">Thành tiền</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {selectedReceipt.items.map((m: any, idx: number) => (
                    <tr key={m.id} className="text-zinc-700">
                      <td className="py-2.5">{idx + 1}</td>
                      <td className="py-2.5 font-mono font-bold text-zinc-850">{m.product?.sku}</td>
                      <td className="py-2.5">{m.product?.name}</td>
                      <td className="py-2.5 text-center">{m.quantity}</td>
                      <td className="py-2.5 text-center">{m.product?.unit}</td>
                      {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
                        <>
                          <td className="py-2.5 text-right">{formatCurrency(Number(m.unitCost))}</td>
                          <td className="py-2.5 text-right font-semibold text-zinc-950">{formatCurrency(Number(m.totalCost))}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
                <div className="border-t border-zinc-300 pt-4 flex justify-between items-start">
                  <div className="text-xs text-zinc-500 italic max-w-sm">
                    {selectedReceipt.type === "IMPORT" 
                      ? "* Giá trị trên đã bao gồm thuế VAT (nếu có) và được tính theo đơn giá trung bình nhập kho thực tế."
                      : "* Giá trị xuất kho được tính dựa theo hình thức bán (Bán lẻ hoặc Bán buôn)."}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 font-bold uppercase mr-4">Tổng cộng:</span>
                    <span className="text-lg font-black text-zinc-950">{formatCurrency(selectedReceipt.items.reduce((sum: number, it: any) => sum + Number(it.totalCost || 0), 0))}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs pt-12 text-zinc-800">
                <div>
                  <p className="font-bold">Người lập phiếu</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <p className="mt-14 font-semibold">{selectedReceipt.createdBy}</p>
                </div>
                <div>
                  <p className="font-bold">Thủ kho</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-bold">Kế toán trưởng</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/10 px-6 py-4 border-t border-border flex justify-end gap-3 print:hidden">
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Đóng
              </button>
              <button 
                onClick={() => {
                  const printContents = document.getElementById("printable-receipt")?.innerHTML;
                  if (!printContents) return;
                  const originalContents = document.body.innerHTML;
                  document.body.innerHTML = printContents;
                  window.print();
                  document.body.innerHTML = originalContents;
                  window.location.reload();
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                In phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT UPDATE MODAL */}
      {paymentModalOpen && selectedOrderForPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Chỉnh sửa thanh toán</h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Tổng tiền đơn</p>
                <p className="font-bold text-lg">{formatCurrency(Number(selectedOrderForPayment.totalAmount || 0))}</p>
              </div>
              <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Đã trả (Cũ)</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(selectedOrderForPayment.paidAmount || 0))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground">Còn nợ (Cũ)</p>
                  <p className="font-bold text-rose-600">{formatCurrency(Number(selectedOrderForPayment.debtAmount || 0))}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">
                    Nhập số tiền đã trả mới
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setPaymentInput(selectedOrderForPayment.totalAmount?.toString() || "0")}
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors"
                  >
                    Trả toàn bộ
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  required
                  value={paymentInput === "" ? "" : Number(paymentInput).toLocaleString("vi-VN")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentInput(val);
                  }}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button disabled={submittingPayment} type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {submittingPayment ? "Đang xử lý..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
