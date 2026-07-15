"use client";

import { useState, useEffect } from "react";
import { Users, Search, MapPin, Phone, User, DollarSign, Receipt, Eye, X, Edit3, Wrench, Calendar } from "lucide-react";
import { formatCurrency, formatDate, statusText, statusBadge, fetchWithDedup } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { toast } from "@/lib/toast";

export default function WorkshopCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Payment edit states
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [paymentInput, setPaymentInput] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [deliverOnPayment, setDeliverOnPayment] = useState(false);

  const fetchCustomers = async (p = 1) => {
    try {
      setLoading(true);
      const data = await fetchWithDedup(`/api/workshop/customers?page=${p}&limit=20&search=${encodeURIComponent(debouncedSearch)}`);
      setCustomers(data.customers || []);
      if (data.pagination) setTotalPages(data.pagination.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(page);
  }, [page, debouncedSearch]);

  const openCustomerModal = async (customer: any) => {
    setCustomerOrders([]);
    setLoadingOrders(true);
    setSelectedCustomer(customer);
    try {
      const res = await fetch(`/api/workshop?customerId=${customer.id}`);
      const data = await res.json();
      const orders = (data.repairOrders || []).filter((ro: any) => ro.customerId === customer.id);
      const sortedOrders = orders.sort((a: any, b: any) => Number(b.debtAmount) - Number(a.debtAmount));
      setCustomerOrders(sortedOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || paymentInput === "") return;
    
    try {
      setSubmittingPayment(true);
      const resPay = await fetch(`/api/workshop/${editingOrder.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentInput) }),
      });
      
      if (!resPay.ok) {
        const err = await resPay.json();
        throw new Error(err.error || "Không thể cập nhật thanh toán");
      }

      if (editingOrder.status !== "DELIVERED" && deliverOnPayment) {
        const resStatus = await fetch(`/api/workshop/${editingOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DELIVERED" }),
        });
        if (!resStatus.ok) {
          const err = await resStatus.json();
          throw new Error(err.error || "Thanh toán thành công nhưng không thể tự động bàn giao xe");
        }
      }

      setEditingOrder(null);
      setPaymentInput("");
      toast.success(editingOrder.status !== "DELIVERED" && deliverOnPayment ? "Thanh toán & Bàn giao xe thành công!" : "Cập nhật thanh toán thành công!");
      
      openCustomerModal(selectedCustomer);
      fetchCustomers(page);
    } catch (error: any) {
      console.error(error);
      toast.error("Lỗi", error.message || "Đã xảy ra lỗi khi thanh toán");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatRoCode = (id: number, dateStr: string) => {
    const d = new Date(dateStr);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
    return `RO-${yyyymmdd}-${id}`;
  };

  return (
    <div className="space-y-6 stagger">

      <div className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SĐT hoặc ID khách..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/40">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/10">
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-left">Khách hàng</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground text-left">Số điện thoại</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Tổng chi phí sửa</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Đã thanh toán</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Công nợ hiện tại</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Đơn nợ</th>
                <th className="p-3 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                      Đang tải danh sách...
                    </span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    Không tìm thấy khách hàng nào có lịch sử sửa xe.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                    <td className="p-3 text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono text-sm text-foreground/80">{c.phone}</td>
                    <td className="p-3 font-semibold text-foreground/90" style={{ textAlign: "right" }}>{formatCurrency(c.totalAmount)}</td>
                    <td className="p-3 font-medium text-emerald-600 dark:text-emerald-400" style={{ textAlign: "right" }}>{formatCurrency(c.totalPaid)}</td>
                    <td className="p-3" style={{ textAlign: "right" }}>
                      {c.totalDebt > 0 ? (
                        <span className="font-extrabold text-rose-600">{formatCurrency(c.totalDebt)}</span>
                      ) : (
                        <span className="text-muted-foreground font-semibold text-xs">Đã thanh toán đủ</span>
                      )}
                    </td>
                    <td className="p-3" style={{ textAlign: "right" }}>
                      <div className="flex justify-end items-center">
                        {c.debtOrdersCount > 0 ? (
                          <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-full text-xs font-bold">
                            {c.debtOrdersCount} đơn nợ
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-semibold text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3" style={{ textAlign: "right" }}>
                      <div className="flex justify-end items-center">
                        <button
                          onClick={() => openCustomerModal(c)}
                          className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <p className="text-xs text-muted-foreground">
              Trang <span className="font-semibold text-foreground">{page}</span> / <span className="font-semibold text-foreground">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${p === page ? "border-primary bg-primary text-white" : "border-border hover:bg-secondary/40"}`}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col animate-scale-up">
            <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">{selectedCustomer.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-2">Danh sách hóa đơn sửa chữa xe</h4>
              
              {loadingOrders ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Đang tải danh sách hóa đơn...</div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm italic">Khách hàng chưa có hóa đơn sửa chữa nào hoàn thành.</div>
              ) : (
                <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary/10 border-b border-border/40">
                        <th className="p-3 font-bold text-muted-foreground">Mã RO</th>
                        <th className="p-3 font-bold text-muted-foreground">Biển số</th>
                        <th className="p-3 font-bold text-muted-foreground">Ngày lập</th>
                        <th className="p-3 font-bold text-muted-foreground text-right">Tổng chi phí</th>
                        <th className="p-3 font-bold text-muted-foreground text-right">Đã trả</th>
                        <th className="p-3 font-bold text-muted-foreground text-right">Còn nợ</th>
                        <th className="p-3 font-bold text-muted-foreground">Trạng thái xe</th>
                        <th className="p-3 font-bold text-muted-foreground text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map((order) => (
                        <tr key={order.id} className="border-b border-border/40 hover:bg-secondary/5">
                          <td className="p-3 font-mono font-bold text-foreground">{formatRoCode(order.id, order.createdAt)}</td>
                          <td className="p-3 font-extrabold text-primary">{order.plateNumber}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(Number(order.totalAmount))}</td>
                          <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(Number(order.paidAmount))}</td>
                          <td className="p-3 text-right font-bold text-rose-600">
                            {Number(order.debtAmount) > 0 ? formatCurrency(Number(order.debtAmount)) : "—"}
                          </td>
                          <td className="p-3">
                            <span className={`badge ${statusBadge(order.status)} text-[10px]`}>
                              {statusText(order.status)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {(order.status === "DONE" || order.status === "DELIVERED") && Number(order.debtAmount) > 0 ? (
                              <button
                                onClick={() => {
                                  setEditingOrder(order);
                                  setPaymentInput(order.debtAmount?.toString() || "0");
                                  setDeliverOnPayment(order.status !== "DELIVERED");
                                }}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center justify-center mx-auto"
                                title={order.status === "DONE" ? "Thanh toán & Bàn giao" : "Cập nhật thanh toán"}
                              >
                                <DollarSign size={14} />
                              </button>
                            ) : (
                              <span className="text-muted-foreground font-semibold text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border bg-secondary/5 flex justify-end">
              <button onClick={() => setSelectedCustomer(null)} className="px-5 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">
                {editingOrder.status !== "DELIVERED" && deliverOnPayment ? "Thanh toán & Bàn giao xe" : "Cập nhật thanh toán"}
              </h3>
              <button onClick={() => setEditingOrder(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Tổng tiền đơn sửa chữa</p>
                <p className="font-bold text-lg">{formatCurrency(Number(editingOrder.totalAmount || 0))}</p>
              </div>
              <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Đã trả (Cũ)</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(editingOrder.paidAmount || 0))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground">Còn nợ (Cũ)</p>
                  <p className="font-bold text-rose-600">{formatCurrency(Number(editingOrder.debtAmount || 0))}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">
                    Khách trả thêm
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setPaymentInput(editingOrder.debtAmount?.toString() || "0")}
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors"
                  >
                    Trả toàn bộ
                  </button>
                </div>
                <NumericInput
                  required
                  value={paymentInput}
                  onChange={setPaymentInput}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              {editingOrder.status !== "DELIVERED" && (
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <input
                    type="checkbox"
                    id="deliverOnPayment"
                    checked={deliverOnPayment}
                    onChange={(e) => setDeliverOnPayment(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border bg-card cursor-pointer"
                  />
                  <label htmlFor="deliverOnPayment" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    Đồng thời bàn giao xe cho khách
                  </label>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setEditingOrder(null)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button disabled={submittingPayment} type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {submittingPayment ? "Đang xử lý..." : (editingOrder.status !== "DELIVERED" && deliverOnPayment ? "Xác nhận & Bàn giao" : "Xác nhận & Lưu")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
