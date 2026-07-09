"use client";

import { useState, useEffect } from "react";
import { Users, Search, Phone, User, DollarSign, Receipt, Eye, X, Edit3, Car } from "lucide-react";
import { fetchWithDedup, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

export default function SalesCustomerDebtsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saleType, setSaleType] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Payment edit states
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [paymentInput, setPaymentInput] = useState<number | string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCustomers = async (p = 1) => {
    try {
      setLoading(true);
      const data = await fetchWithDedup(`/api/sales/customers?page=${p}&limit=20&saleType=${saleType}&search=${encodeURIComponent(search)}`);
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
  }, [page, saleType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const getVehicleContractTotal = (v: any) => {
    const accs = JSON.parse(v.accessoriesJson || "[]");
    const accsCost = accs.reduce((sum: number, curr: any) => sum + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
    return Number(v.listPrice) + Number(v.plateCost || 0) + accsCost;
  };

  const openCustomerModal = async (customer: any) => {
    setSelectedCustomer(customer);
    try {
      setLoadingVehicles(true);
      const data = await fetchWithDedup(`/api/sales?customerId=${customer.id}&limit=100&status=RESERVED,SOLD&saleType=${saleType}`);
      // Sort vehicles by debt amount descending
      const sortedVehicles = (data.vehicles || []).sort((a: any, b: any) => Number(b.debtAmount) - Number(a.debtAmount));
      setCustomerVehicles(sortedVehicles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || paymentInput === "") return;
    
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/sales/vehicles/${editingOrder.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentInput) }),
      });
      if (res.ok) {
        setEditingOrder(null);
        setPaymentInput("");
        // Reload details for this customer
        openCustomerModal(selectedCustomer);
        // Reload customer list
        fetchCustomers(page);
      } else {
        alert("Có lỗi xảy ra khi cập nhật thanh toán");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi mạng");
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between pb-5 border-b border-border flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Kinh doanh xe
          </p>
          <h1 className="text-3xl font-black text-foreground tracking-tight mt-1 flex items-center gap-3">
            <Users className="text-primary w-8 h-8" />
            Khách hàng & Công nợ xe
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <form onSubmit={handleSearch} className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
          />
        </form>
        <div className="flex rounded-xl border border-border bg-card p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setSaleType("RETAIL"); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg ${saleType === "RETAIL" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/50"}`}
          >
            Bán lẻ
          </button>
          <button
            type="button"
            onClick={() => { setSaleType("WHOLESALE"); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg ${saleType === "WHOLESALE" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/50"}`}
          >
            Bán buôn
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30 text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold w-[250px]">Khách hàng</th>
                <th className="px-4 py-3 font-bold">Vị trí (Địa chỉ)</th>
                <th className="px-4 py-3 font-bold text-right">Tổng Mua Xe</th>
                <th className="px-4 py-3 font-bold text-right">Hợp Đồng Gần Nhất</th>
                <th className="px-4 py-3 font-bold text-right">Đã Thanh Toán</th>
                <th className="px-4 py-3 font-bold text-right">Còn Nợ</th>
                <th className="px-4 py-3 font-bold text-center">Số Xe Nợ</th>
                <th className="px-4 py-3 font-bold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground text-sm mt-3 font-medium">Đang tải danh sách...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Không tìm thấy khách hàng mua xe nào.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/10 transition-colors group cursor-pointer" onClick={() => openCustomerModal(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-xs">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {c.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {c.address || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground text-xs">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs">
                      {formatCurrency(c.latestOrderAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 text-xs">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 text-xs">
                      {formatCurrency(c.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.debtOrdersCount > 0 ? (
                        <span className="bg-rose-500/10 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/20">
                          {c.debtOrdersCount} xe nợ
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-semibold">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openCustomerModal(c); }}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <div className="text-xs text-muted-foreground">
              Trang <span className="font-semibold">{page}</span> / <span className="font-semibold">{totalPages}</span>
            </div>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary disabled:opacity-50 transition-all"
              >
                Trước
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary disabled:opacity-50 transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Vehicles Modal */}
      {selectedCustomer && !editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Hồ sơ: {selectedCustomer.name}</h3>
                  <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <span>{selectedCustomer.phone}</span>
                    {selectedCustomer.address && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>{selectedCustomer.address}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Car size={16} className="text-primary" /> Lịch sử mua xe & công nợ
              </h4>

              {loadingVehicles ? (
                <div className="text-center py-10 text-muted-foreground font-medium">Đang tải danh sách xe...</div>
              ) : customerVehicles.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-medium bg-secondary/10 rounded-xl">Khách hàng chưa có lịch sử mua xe nào.</div>
              ) : (
                <div className="space-y-3">
                  {customerVehicles.map(veh => {
                    const totalContractVal = getVehicleContractTotal(veh);
                    return (
                      <div key={veh.id} className="border border-border bg-secondary/5 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                        <div>
                          <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                            {veh.model} {veh.variant ? `(${veh.variant})` : ""}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
                            <span>VIN: <span className="font-bold text-foreground">{veh.vin}</span></span>
                            <span>Màu: <span className="font-bold text-foreground">{veh.color || "N/A"}</span></span>
                            <span>Trạng thái: <span className="font-bold text-foreground">{veh.status === "SOLD" ? "Đã bán" : "Đã cọc"}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right ml-auto shrink-0">
                          <div>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Tổng cộng</div>
                            <div className="font-bold text-foreground text-sm">{formatCurrency(totalContractVal)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Đã trả</div>
                            <div className="font-bold text-emerald-600 text-sm">{formatCurrency(Number(veh.paidAmount))}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Còn nợ</div>
                            <div className="font-black text-rose-600 text-sm">{formatCurrency(Number(veh.debtAmount))}</div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingOrder(veh);
                              setPaymentInput(Number(veh.paidAmount));
                            }}
                            className={`p-2 rounded-xl border ${Number(veh.debtAmount) > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"} transition-colors`}
                            title="Cập nhật thanh toán"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <DollarSign className="text-emerald-500" /> Cập nhật thanh toán xe
              </h3>
              <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitPayment} className="p-6">
              <div className="bg-secondary/10 p-4 rounded-xl mb-6 border border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-muted-foreground">Xe đã chọn:</span>
                  <span className="font-bold text-primary">{editingOrder.model}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-muted-foreground">Số VIN:</span>
                  <span className="font-bold font-mono text-xs">{editingOrder.vin}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-muted-foreground">Tổng hợp đồng:</span>
                  <span className="font-bold">{formatCurrency(getVehicleContractTotal(editingOrder))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Khách nợ cũ:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(Number(editingOrder.debtAmount))}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tổng số tiền khách đã trả tới thời điểm này</label>
                  <div className="relative">
                    <NumericInput
                      required
                      value={paymentInput}
                      onChange={setPaymentInput}
                      className="w-full pl-4 pr-12 py-2.5 bg-background border border-border rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">VNĐ</div>
                  </div>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentInput(getVehicleContractTotal(editingOrder))}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-all"
                    >
                      [ Trả đủ: {formatCurrency(getVehicleContractTotal(editingOrder))} ]
                    </button>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Phần nợ sẽ được hệ thống tự tính lại.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="px-5 py-2.5 rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    {submittingPayment ? "Đang lưu..." : "Xác nhận & Lưu"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
