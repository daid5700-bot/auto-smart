"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, DollarSign, FileText, X } from "lucide-react";
import { formatCurrency, formatDate, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

export default function InventoryOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/orders?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const openPaymentModal = (order: any) => {
    setSelectedOrder(order);
    setPaymentAmount(order.debtAmount?.toString() || "0");
    setPaymentModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !paymentAmount) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/inventory/orders/${selectedOrder.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentAmount) }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        fetchOrders();
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
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử xuất/bán kho</h2>
          </div>
        <Link
          href="/inventory/orders/new"
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"
        >
          <Plus size={16} /> Lập phiếu xuất/bán mới
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên hoặc SĐT khách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-sm">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Mã đơn & Thời gian</th>
              <th>Khách hàng</th>
              <th>Loại xuất</th>
              <th>Thông tin thanh toán</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                  Không tìm thấy đơn xuất kho nào.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="font-mono font-bold text-foreground">{o.code}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
                  </td>
                  <td>
                    {o.customer ? (
                      <div>
                        <div className="font-bold text-foreground">{o.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Khách lẻ vô danh</span>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-secondary text-muted-foreground border-none">
                      {o.type === "EXPORT_RETAIL" ? "Bán Lẻ" : o.type === "EXPORT_WHOLESALE" ? "Bán Buôn" : "Nội bộ"}
                    </span>
                  </td>
                  <td>
                    <div className="space-y-1 text-xs">
                      <div>Tổng: <span className="font-bold">{formatCurrency(Number(o.totalAmount))}</span></div>
                      <div>Đã trả: <span className="text-emerald-600 font-bold">{formatCurrency(Number(o.paidAmount))}</span></div>
                      <div>Còn nợ: <span className="text-rose-600 font-bold">{formatCurrency(Number(o.debtAmount))}</span></div>
                    </div>
                  </td>
                  <td>
                    {o.status === "PAID" ? (
                      <span className="badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Đã thanh toán</span>
                    ) : (
                      <span className="badge bg-rose-500/10 text-rose-600 border border-rose-500/20">Đang nợ</span>
                    )}
                  </td>
                  <td>
                    {o.status === "DEBT" && (
                      <button
                        onClick={() => openPaymentModal(o)}
                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-500 transition-colors"
                        title="Cập nhật thanh toán"
                      >
                        <DollarSign size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Cập nhật nợ - Đơn kho</h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Mã đơn</p>
                <p className="font-bold font-mono">{selectedOrder.code}</p>
              </div>
              {selectedOrder.customer && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Khách hàng</p>
                  <p className="font-bold">{selectedOrder.customer.name} ({selectedOrder.customer.phone})</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Còn nợ</p>
                <p className="text-rose-600 font-bold text-lg">{formatCurrency(Number(selectedOrder.debtAmount || 0))}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  Khách trả thêm
                </label>
                <NumericInput
                  required
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button disabled={submittingPayment} type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {submittingPayment ? "Đang xử lý..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
