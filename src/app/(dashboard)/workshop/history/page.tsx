"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate, statusText, statusBadge, parseSymptoms } from "@/lib/utils";
import { Loader2, Search, Eye, X, Wrench, User, Phone, Calendar, DollarSign, Package, AlertCircle, CheckCircle, CalendarDays } from "lucide-react";
import { toast } from "@/lib/toast";
import { useModal } from "@/components/ModalProvider";


export default function HistoryPage() {
  const modal = useModal();
  const [orders, setOrders] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [submittingDelivery, setSubmittingDelivery] = useState<string | null>(null);

  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<"today" | "week" | "month" | null>(null);

  // Quick date presets
  const applyPreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "today") {
      setDateFrom(toISO(now));
      setDateTo(toISO(now));
    } else if (preset === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      setDateFrom(toISO(startOfWeek));
      setDateTo(toISO(now));
    } else if (preset === "month") {
      setDateFrom(toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
      setDateTo(toISO(now));
    }
    setActivePreset(preset);
    setPage(1);
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setActivePreset(null);
    setPage(1);
  };

  const handleDeliverOrder = async (orderId: string) => {
    const confirmed = await modal.confirm({
      title: "Xác nhận bàn giao xe",
      message: "Bạn có chắc chắn muốn bàn giao xe này cho khách hàng không?",
      type: "success",
      confirmText: "Xác nhận bàn giao",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setSubmittingDelivery(orderId);
      const res = await fetch(`/api/workshop/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể bàn giao xe");
      }
      toast.success("Thành công", "Bàn giao xe thành công!");
      
      setOrders((prev: any[]) => prev.map(o => o.id === orderId ? { ...o, status: "DELIVERED" } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: "DELIVERED" } : null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi", e.message || "Lỗi bàn giao xe");
    } finally {
      setSubmittingDelivery(null);
    }
  };

  const fetchData = async (pageVal = 1, searchVal = "", from = "", to = "") => {
    // First load: show full-page spinner. Subsequent: only overlay on table.
    if (orders.length === 0 && pageVal === 1 && !searchVal && !from && !to) {
      setInitialLoading(true);
    } else {
      setTableLoading(true);
    }
    try {
      let url = `/api/workshop?page=${pageVal}&limit=20&search=${encodeURIComponent(searchVal)}`;
      if (from) url += `&dateFrom=${from}`;
      if (to) url += `&dateTo=${to}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.repairOrders || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(page, search, dateFrom, dateTo);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search, dateFrom, dateTo]);

  const filteredOrders = orders;

  const formatRoCode = (id: number, dateStr: string) => {
    const d = new Date(dateStr);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, "");
    return `RO-${yyyymmdd}-${id}`;
  };

  // Check if a date filter is active
  const hasDateFilter = !!dateFrom || !!dateTo;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">

      {/* Search + Date filter — single row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm biển số, dòng xe, tên khách, SĐT hoặc ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Right group: date range + presets + clear */}
        <div className="ml-auto flex items-center gap-2">
          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null); setPage(1); }}
              className="text-sm font-semibold bg-transparent outline-none text-foreground cursor-pointer"
            />
            <span className="text-muted-foreground text-xs font-medium px-1">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset(null); setPage(1); }}
              className="text-sm font-semibold bg-transparent outline-none text-foreground cursor-pointer"
            />
          </div>

          {/* Quick preset buttons */}
          {([
            { label: "Hôm nay", key: "today" as const },
            { label: "Tuần này", key: "week" as const },
            { label: "Tháng này", key: "month" as const },
          ] as const).map(({ label, key }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                activePreset === key
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Clear filter button */}
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="px-2.5 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all flex items-center gap-1"
            >
              <X size={11} /> Xóa lọc
            </button>
          )}
        </div>
      </div>

      <div className="relative glass-card rounded-2xl overflow-hidden border border-border/40">
        {/* Subtle loading overlay on table only */}
        {tableLoading && (
          <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl pointer-events-none">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-md">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Đang tải...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/10">
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Biển số xe</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Dòng xe</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Khách hàng</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Số điện thoại</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">KTV đảm nhận</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Tiền công</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Phụ tùng</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Tổng chi phí</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground">Trạng thái</th>
                <th className="p-4 font-bold text-xs uppercase text-muted-foreground" style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o: any) => (
                <tr key={o.id} className="border-b border-border/40 hover:bg-secondary/5 transition-colors">
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="font-extrabold text-primary hover:underline focus:outline-none"
                    >
                      {o.plateNumber}
                    </button>
                  </td>
                  <td className="p-4 font-semibold text-foreground/90">{o.vehicleModel || "—"}</td>
                  <td className="p-4 font-medium text-foreground">{o.customer?.name}</td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{o.customer?.phone}</td>
                  <td className="p-4 text-foreground/80">{o.technician?.name || "Chưa giao việc"}</td>
                  <td className="p-4 text-foreground/80">{formatCurrency(Number(o.laborCost))}</td>
                  <td className="p-4 text-foreground/80">{formatCurrency(Number(o.partsCost))}</td>
                  <td className="p-4">
                    <div className="font-extrabold text-primary">{formatCurrency(Number(o.totalAmount))}</div>
                    {(() => {
                      const labor = Number(o.laborCost) || 0;
                      const parts = Number(o.partsCost) || 0;
                      const total = Number(o.totalAmount) || 0;
                      const discount = Math.round(labor + parts - total);
                      if (discount >= 1000) {
                        return (
                          <div className="text-[10px] text-success font-bold mt-0.5" title="Hóa đơn có giảm giá">
                            Giảm: -{formatCurrency(discount)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td className="p-4">
                    <span className={`badge ${statusBadge(o.status)}`}>
                      {statusText(o.status)}
                    </span>
                  </td>
                  <td className="p-4" style={{ textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-2">
                      {o.status === "DONE" && (
                        <button
                          disabled={submittingDelivery === o.id}
                          onClick={() => handleDeliverOrder(o.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                          title="Bàn giao xe cho khách"
                        >
                          {submittingDelivery === o.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          Bàn giao xe
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors inline-flex items-center justify-center"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    Không tìm thấy lịch sử phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!initialLoading && totalPages > 1 && (
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

      {/* DETAILED REPAIR ORDER MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/15">
              <div>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                  {formatRoCode(selectedOrder.id, selectedOrder.createdAt)}
                </span>
                <h3 className="text-xl font-black text-foreground mt-0.5">Chi tiết Lịch sử Sửa chữa</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* General details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Vehicle card */}
                <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Wrench size={12} className="text-primary" /> Thông tin xe
                  </div>
                  <p className="text-lg font-black text-primary">{selectedOrder.plateNumber}</p>
                  <p className="text-xs font-semibold text-foreground/80">{selectedOrder.vehicleModel || "Chưa rõ dòng xe"}</p>
                  <p className="text-[11px] text-muted-foreground">Số KM vào: <span className="font-bold text-foreground">{selectedOrder.kmIn?.toLocaleString() || 0} km</span></p>
                </div>

                {/* Customer card */}
                <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    <User size={12} className="text-primary" /> Khách hàng
                  </div>
                  <p className="text-base font-bold text-foreground">{selectedOrder.customer?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedOrder.customer?.phone}</p>
                  <p className="text-[11px] text-muted-foreground">Nguồn: <span className="font-semibold">{selectedOrder.customer?.source || "Trực tiếp"}</span></p>
                </div>

                {/* Technician card */}
                <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    <User size={12} className="text-primary" /> Nhân sự thực hiện
                  </div>
                  <p className="text-base font-bold text-foreground">{selectedOrder.technician?.name || "Chưa giao việc"}</p>
                  <p className="text-xs text-muted-foreground">Kỹ thuật viên sửa chữa</p>
                  <p className="text-[11px] text-muted-foreground">Trạng thái KTV: <span className="font-semibold text-success">Hoạt động</span></p>
                </div>

                {/* Date status card */}
                <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={12} className="text-primary" /> Thời gian & Trạng thái
                  </div>
                  <div>
                    <span className={`badge ${statusBadge(selectedOrder.status)} text-[10px]`}>
                      {statusText(selectedOrder.status)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1.5">Tiếp nhận: {formatDate(selectedOrder.createdAt)}</p>
                  <p className="text-[11px] text-muted-foreground">Cập nhật: {formatDate(selectedOrder.updatedAt)}</p>
                </div>

              </div>

              {/* Symptoms / Notes section */}
              <div className="space-y-4">
                <div className="p-4 bg-secondary/5 border border-border/40 rounded-2xl">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Triệu chứng & Yêu cầu của khách</h4>
                  {(() => {
                    const parsed = parseSymptoms(selectedOrder.symptoms);
                    return (
                      <div className="space-y-2 text-xs">
                        <p className="text-sm text-foreground/90 font-semibold">{parsed.summary || "Không ghi chú triệu chứng"}</p>
                        {parsed.services.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Hạng mục công việc:</p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1">
                              {parsed.services.map((srv: any, i: number) => (
                                <li key={i} className="text-foreground/80">
                                  {srv.name} — <span className="font-bold text-primary">{formatCurrency(Number(srv.cost))}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-4 bg-secondary/5 border border-border/40 rounded-2xl">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tình trạng xe khi tiếp nhận</h4>
                  <p className="text-sm text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedOrder.carCondition || "Không ghi nhận trầy xước ngoại quan"}
                  </p>
                </div>
              </div>

              {/* Parts & Services breakdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Package size={15} className="text-primary" />
                  <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Danh sách phụ tùng thay thế</h4>
                </div>
                
                {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-3">Không sử dụng phụ tùng thay thế trong lệnh này.</p>
                ) : (
                  <div className="border border-border/40 rounded-xl overflow-hidden bg-card">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-secondary/10 border-b border-border/40">
                          <th className="p-3 font-bold text-muted-foreground">Mã phụ tùng</th>
                          <th className="p-3 font-bold text-muted-foreground">Tên phụ tùng</th>
                          <th className="p-3 font-bold text-muted-foreground text-center">Số lượng</th>
                          <th className="p-3 font-bold text-muted-foreground text-right">Đơn giá</th>
                          <th className="p-3 font-bold text-muted-foreground text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item: any) => (
                          <tr key={item.id} className="border-b border-border/40 hover:bg-secondary/5">
                            <td className="p-3 font-mono font-bold text-foreground/80">{item.product?.sku}</td>
                            <td className="p-3 font-medium text-foreground">{item.product?.name}</td>
                            <td className="p-3 text-center font-bold">{item.quantity}</td>
                            <td className="p-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                            <td className="p-3 text-right font-bold text-primary">{formatCurrency(item.quantity * Number(item.unitPrice))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cost breakdown summary */}
              <div className="flex flex-col md:flex-row md:justify-end">
                <div className="w-full md:w-80 p-5 bg-secondary/10 border border-border/40 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                    <DollarSign size={14} className="text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tóm tắt Chi phí</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tiền công dịch vụ:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(Number(selectedOrder.laborCost))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tiền phụ tùng:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(Number(selectedOrder.partsCost))}</span>
                  </div>
                  {(() => {
                    const parsed = parseSymptoms(selectedOrder.symptoms);
                    const labor = Number(selectedOrder.laborCost) || 0;
                    const parts = Number(selectedOrder.partsCost) || 0;
                    const total = Number(selectedOrder.totalAmount) || 0;
                    
                    const serviceDiscountAmount = Math.round(labor * (parsed.serviceDiscountPercent / 100));
                    const partsDiscountAmount = Math.round(parts * (parsed.partsDiscountPercent / 100));
                    const totalDiscount = Math.round(labor + parts - total);
                    const loyaltyDiscount = Math.max(0, totalDiscount - (serviceDiscountAmount + partsDiscountAmount));

                    return (
                      <>
                        {serviceDiscountAmount > 0 && (
                          <div className="flex justify-between text-xs text-destructive">
                            <span className="font-medium">Giảm giá dịch vụ ({parsed.serviceDiscountPercent}%):</span>
                            <span className="font-semibold">-{formatCurrency(serviceDiscountAmount)}</span>
                          </div>
                        )}
                        {partsDiscountAmount > 0 && (
                          <div className="flex justify-between text-xs text-destructive">
                            <span className="font-medium">Giảm giá phụ tùng ({parsed.partsDiscountPercent}%):</span>
                            <span className="font-semibold">-{formatCurrency(partsDiscountAmount)}</span>
                          </div>
                        )}
                        {loyaltyDiscount >= 1000 && (
                          <div className="flex justify-between text-xs text-success">
                            <span className="font-medium">Giảm giá đổi điểm:</span>
                            <span className="font-semibold">-{formatCurrency(loyaltyDiscount)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-border/40">
                    <span className="text-xs font-bold text-foreground">Tổng chi phí:</span>
                    <span className="text-base font-black text-primary">{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5">
                    <span className="text-muted-foreground font-medium">Đã thanh toán:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(Number(selectedOrder.paidAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs pb-1.5">
                    <span className="text-muted-foreground font-medium">Còn nợ:</span>
                    <span className="font-bold text-rose-600">{formatCurrency(Number(selectedOrder.debtAmount || 0))}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 text-right italic pt-1">
                    * Đã bao gồm thuế giá trị gia tăng dự tính
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border bg-secondary/5 flex justify-end gap-3">
              {selectedOrder.status === "DONE" && (
                <button
                  disabled={submittingDelivery === selectedOrder.id}
                  onClick={() => handleDeliverOrder(selectedOrder.id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingDelivery === selectedOrder.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} />
                      Bàn giao xe
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs font-bold transition-colors"
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
