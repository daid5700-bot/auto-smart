"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { exportToCsv, formatCurrency, formatDate, formatExportDate, statusText, statusBadge, parseSymptoms } from "@/lib/utils";
import { Loader2, Search, Eye, X, Wrench, User, Phone, Calendar, DollarSign, Package, AlertCircle, CheckCircle, CalendarDays, TicketPercent, Download } from "lucide-react";
import { toast } from "@/lib/toast";
import { useModal } from "@/components/ModalProvider";
import { CustomSelect } from "@/components/CustomSelect";
import { ModalPortal } from "@/components/modal-portal";
import { formatAppDateInput, getAppDatePresetRange } from "@/lib/date-range";


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
  const [discountFilter, setDiscountFilter] = useState("ALL");
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const activeListRequest = useRef<AbortController | null>(null);
  const hasLoadedList = useRef(false);

  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<"today" | "week" | "month" | null>(null);

  // Quick date presets
  const applyPreset = (preset: "today" | "week" | "month") => {
    const range = getAppDatePresetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
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

  const fetchData = useCallback(async (pageVal = 1, searchVal = "", from = "", to = "") => {
    // First load: show full-page spinner. Subsequent: only overlay on table.
    if (!hasLoadedList.current && pageVal === 1 && !searchVal && !from && !to) {
      setInitialLoading(true);
    } else {
      setTableLoading(true);
    }
    activeListRequest.current?.abort();
    const controller = new AbortController();
    activeListRequest.current = controller;
    try {
      let url = `/api/workshop?view=history&page=${pageVal}&limit=20&search=${encodeURIComponent(searchVal)}`;
      if (from) url += `&dateFrom=${from}`;
      if (to) url += `&dateTo=${to}`;
      if (discountFilter !== "ALL") url += `&discount=${discountFilter}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải lịch sử sửa chữa");
      setOrders(data.repairOrders || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error(e);
    } finally {
      if (!controller.signal.aborted) {
        hasLoadedList.current = true;
        setInitialLoading(false);
        setTableLoading(false);
      }
    }
  }, [discountFilter]);

  const openOrderDetail = async (orderId: number) => {
    try {
      setDetailLoadingId(orderId);
      const response = await fetch(`/api/workshop/${orderId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không thể tải chi tiết lệnh sửa chữa");
      }
      setSelectedOrder(payload);
    } catch (error: any) {
      toast.error("Không thể mở chi tiết", error.message);
    } finally {
      setDetailLoadingId(null);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, discountFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(page, search, dateFrom, dateTo);
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      activeListRequest.current?.abort();
    };
  }, [fetchData, page, search, dateFrom, dateTo]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/discounts?scope=WORKSHOP", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setDiscounts(data.discounts || []))
      .catch((error) => {
        if (error?.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);

  const filteredOrders = orders;

  const handleExportExcel = () => {
    exportToCsv(
      `Lich_su_ho_so_sua_chua_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Mã lệnh", "Biển số xe", "Dòng xe", "Khách hàng", "Số điện thoại", "KTV", "Tiền công", "Phụ tùng", "Tổng chi phí", "Trạng thái", "Thời gian"],
      filteredOrders.map((order: any) => [
        formatRoCode(order.id, order.createdAt),
        order.plateNumber || "",
        order.vehicleModel || "",
        order.customer?.name || order.customerName || "",
        order.customer?.phone || order.phone || "",
        order.technician?.name || "Chưa giao việc",
        String(Number(order.laborCost || order.laborAmount || 0)),
        String(Number(order.partsCost || order.partsAmount || 0)),
        String(Number(order.totalCost || order.totalAmount || 0)),
        statusText(order.status),
        formatExportDate(order.createdAt),
      ]),
    );
  };

  const formatRoCode = (id: number, dateStr: string) => {
    const d = new Date(dateStr);
    const yyyymmdd = formatAppDateInput(d).replace(/-/g, "");
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

        <div className="w-[200px]">
          <CustomSelect
            value={discountFilter}
            onChange={(val) => setDiscountFilter(val)}
            options={[
              { value: "ALL", label: "Tất cả giảm giá" },
              { value: "ANY", label: "Có sử dụng giảm giá" },
              { value: "NONE", label: "Không sử dụng giảm giá" },
              ...discounts.map((discount) => ({
                value: String(discount.id),
                label: `${discount.code} — ${discount.name}`,
                badge: discount.code,
                badgeVariant: "info" as const,
              })),
            ]}
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

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={filteredOrders.length === 0}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} /> Xuất Excel
        </button>
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
                      onClick={() => openOrderDetail(o.id)}
                      disabled={detailLoadingId === o.id}
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
                        onClick={() => openOrderDetail(o.id)}
                        disabled={detailLoadingId === o.id}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors inline-flex items-center justify-center"
                        title="Xem chi tiết"
                      >
                        {detailLoadingId === o.id
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Eye size={16} />}
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
        <ModalPortal>
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
                    <p className="text-[11px] text-muted-foreground">Số KM vào: <strong className="text-foreground">{selectedOrder.kmIn?.toLocaleString() || 0} km</strong></p>
                  </div>

                  {/* Customer card */}
                  <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <User size={12} className="text-primary" /> Khách hàng
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{selectedOrder.customer?.name || "Khách vãng vãng"}</p>
                    <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Phone size={10} /> {selectedOrder.customer?.phone || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">Nguồn: <strong>{selectedOrder.customer?.source || "WALKIN"}</strong></p>
                  </div>

                  {/* Technician card */}
                  <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <User size={12} className="text-primary" /> Nhân sự thực hiện
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{selectedOrder.technician?.name || "Chưa phân công"}</p>
                    <p className="text-[11px] text-muted-foreground">Kỹ thuật viên sửa chữa</p>
                    {selectedOrder.technician && (
                      <p className="text-[10px] text-emerald-600 font-bold">Trạng thái KTV: Hoạt động</p>
                    )}
                  </div>

                  {/* Time & status card */}
                  <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <Calendar size={12} className="text-primary" /> Thời gian & Trạng thái
                    </div>
                    <div>
                      <span className={`badge ${statusBadge(selectedOrder.status)} text-[10px]`}>
                        {statusText(selectedOrder.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-1">Tiếp nhận: <strong className="text-foreground">{formatDate(selectedOrder.createdAt)}</strong></p>
                    <p className="text-[11px] text-muted-foreground">Cập nhật: <strong className="text-foreground">{formatDate(selectedOrder.updatedAt)}</strong></p>
                  </div>

                </div>

                {/* Symptoms & Labor work */}
                <div className="p-4 bg-secondary/5 border border-border/40 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Triệu chứng & Yêu cầu của khách</h4>
                  {(() => {
                    const parsed = parseSymptoms(selectedOrder.symptoms);
                    return (
                      <div className="space-y-3 text-xs">
                        {parsed.summary ? (
                          <p className="font-semibold text-foreground bg-card p-3 rounded-xl border border-border/40">{parsed.summary}</p>
                        ) : (
                          <p className="text-muted-foreground italic">Không có ghi chú triệu chứng</p>
                        )}
                        {parsed.services.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Hạng mục công việc:</span>
                            <ul className="space-y-1 pl-4 list-disc text-foreground">
                              {parsed.services.map((item: any, idx: number) => (
                                <li key={idx} className="font-medium">
                                  {item.name} — <strong className="text-primary">{formatCurrency(item.cost)}</strong>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Receiving Vehicle Condition */}
                {selectedOrder.carCondition && (
                  <div className="p-4 bg-secondary/5 border border-border/40 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tình trạng xe khi tiếp nhận</h4>
                    <p className="text-xs font-medium text-foreground bg-card p-3 rounded-xl border border-border/40">{selectedOrder.carCondition}</p>
                  </div>
                )}

                {/* Requisition items (parts) table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package size={14} className="text-primary" /> Danh sách phụ tùng thay thế
                  </h4>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-bold uppercase text-[10px]">
                            <th className="p-3">Mã SKU</th>
                            <th className="p-3">Tên phụ tùng</th>
                            <th className="p-3 text-center">Số lượng</th>
                            <th className="p-3 text-right">Đơn giá</th>
                            <th className="p-3 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {selectedOrder.items.map((item: any) => (
                            <tr key={item.id} className="hover:bg-secondary/10">
                              <td className="p-3 font-mono text-muted-foreground font-semibold">{item.product?.sku || "—"}</td>
                              <td className="p-3 font-bold text-foreground">{item.productName}</td>
                              <td className="p-3 text-center font-bold">{item.quantity}</td>
                              <td className="p-3 text-right font-medium text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                              <td className="p-3 text-right font-bold text-primary">{formatCurrency(Number(item.totalPrice))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-secondary/5 border border-border/40 rounded-2xl text-center text-xs text-muted-foreground italic">
                      Không sử dụng phụ tùng thay thế trong lệnh này.
                    </div>
                  )}
                </div>

                {/* Costs Summary */}
                <div className="p-4 bg-card border border-border/60 rounded-2xl space-y-2 max-w-sm ml-auto shadow-sm">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Tiền công dịch vụ:</span>
                    <span className="font-bold text-foreground">{formatCurrency(Number(selectedOrder.laborCost))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Tiền phụ tùng:</span>
                    <span className="font-bold text-foreground">{formatCurrency(Number(selectedOrder.partsCost))}</span>
                  </div>
                  {(() => {
                    const parsed = parseSymptoms(selectedOrder.symptoms);
                    const serviceDiscountAmount = Math.round((Number(selectedOrder.laborCost) * (parsed.serviceDiscountPercent || 0)) / 100);
                    const partsDiscountAmount = Math.round((Number(selectedOrder.partsCost) * (parsed.partsDiscountPercent || 0)) / 100);
                    const loyaltyDiscount = Number(selectedOrder.loyaltyDiscountAmount || 0);
                    const recordedDiscount = Number(selectedOrder.discountAmount || 0);

                    return (
                      <>
                        {selectedOrder.appliedDiscountCode && recordedDiscount >= 1000 ? (
                          <div className="flex justify-between text-xs text-success">
                            <span className="font-medium flex items-center gap-1">
                              <TicketPercent size={12} />
                              Mã giảm giá ({selectedOrder.appliedDiscountCode}):
                            </span>
                            <span className="font-semibold">-{formatCurrency(recordedDiscount)}</span>
                          </div>
                        ) : recordedDiscount >= 1000 ? (
                          <div className="flex justify-between text-xs text-success">
                            <span className="font-medium flex items-center gap-1">
                              <TicketPercent size={12} />
                              Giảm giá ({
                                selectedOrder.appliedDiscountType === "PERCENTAGE"
                                  ? `${selectedOrder.appliedDiscountValue}% cho ${
                                      selectedOrder.appliedDiscountTarget === "SERVICE"
                                        ? "dịch vụ"
                                        : selectedOrder.appliedDiscountTarget === "PARTS"
                                          ? "phụ tùng"
                                          : "toàn lệnh"
                                    }`
                                  : selectedOrder.appliedDiscountType === "FIXED_AMOUNT"
                                    ? "Số tiền cố định"
                                    : "Dữ liệu giảm giá cũ"
                              }):
                            </span>
                            <span className="font-semibold">-{formatCurrency(recordedDiscount)}</span>
                          </div>
                        ) : serviceDiscountAmount > 0 && (
                          <div className="flex justify-between text-xs text-destructive">
                            <span className="font-medium">Giảm dịch vụ ({parsed.serviceDiscountPercent}%):</span>
                            <span className="font-semibold">-{formatCurrency(serviceDiscountAmount)}</span>
                          </div>
                        )}
                        {partsDiscountAmount > 0 && !selectedOrder.appliedDiscountCode && (
                          <div className="flex justify-between text-xs text-destructive">
                            <span className="font-medium">Giảm phụ tùng ({parsed.partsDiscountPercent}%):</span>
                            <span className="font-semibold">-{formatCurrency(partsDiscountAmount)}</span>
                          </div>
                        )}
                        {loyaltyDiscount >= 1000 && (
                          <div className="flex justify-between text-xs text-emerald-600">
                            <span className="font-medium">Giảm đổi điểm loyalty:</span>
                            <span className="font-semibold">-{formatCurrency(loyaltyDiscount)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="border-t border-dashed border-border/40 pt-2 flex justify-between items-center">
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
        </ModalPortal>
      )}

    </div>
  );
}
