"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Loader2, FileText, Plus, Edit, Trash2, Search, User, 
  Sparkles, Wrench, Check, Car, DollarSign, X, Eye
} from "lucide-react";
import { fetchWithDedup, formatCurrency, formatDate, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { useModal } from "@/components/ModalProvider";


interface Accessory {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function DocumentsPage() {
  const modal = useModal();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, RESERVED, SOLD
  const [plateFilter, setPlateFilter] = useState("ALL"); // ALL, PENDING, TAX_PAID, PLATE_DONE
  const [saleTypeFilter, setSaleTypeFilter] = useState<"RETAIL" | "WHOLESALE">("RETAIL");

  // Payment & Detail Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const openDetailModal = (v: any) => {
    setSelectedVehicle(v);
    setDetailModalOpen(true);
  };

  const openPaymentModal = (v: any) => {
    setSelectedVehicle(v);
    setPaymentAmount(v.debtAmount?.toString() || "0");
    setPaymentModalOpen(true);
  };

  const openGroupPaymentModal = (group: any) => {
    setSelectedVehicle({
      isGroup: true,
      vehicles: group.vehicles,
      customer: group.customer,
      paidAmount: group.totalPaid,
      debtAmount: group.totalDebt,
    });
    setPaymentAmount(group.totalDebt.toString());
    setPaymentModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !paymentAmount) return;
    try {
      setSubmittingPayment(true);
      const isGroup = selectedVehicle.isGroup;
      const url = isGroup 
        ? "/api/sales/wholesale/payment"
        : `/api/sales/vehicles/${selectedVehicle.id}/payment`;
        
      const body = isGroup
        ? { vehicleIds: selectedVehicle.vehicles.map((v: any) => v.id), amount: Number(paymentAmount) }
        : { amount: Number(paymentAmount) };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        await modal.alert({
          title: "Thành công",
          message: "Đã cập nhật thanh toán thành công!",
          type: "success",
        });
        fetchData(1, false);
      } else {
        const err = await res.json().catch(() => ({}));
        await modal.alert({
          title: "Thất bại",
          message: err.error || "Gặp lỗi khi cập nhật thanh toán",
          type: "error",
        });
      }
    } catch (error: any) {
      await modal.alert({
        title: "Lỗi kết nối",
        message: error.message,
        type: "error",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const fetchData = async (targetPage = 1, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      const data = await fetchWithDedup(`/api/sales?status=RESERVED,SOLD&limit=20&page=${targetPage}&saleType=${saleTypeFilter}&search=${encodeURIComponent(searchQuery)}`);
      setVehicles((prev) => append ? [...prev, ...(data.vehicles || [])] : (data.vehicles || []));
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchData(1, false), 300);
    return () => window.clearTimeout(timer);
  }, [saleTypeFilter, searchQuery]);

  useEffect(() => {
    const onScroll = () => {
      if (loading || loadingMore || page >= totalPages) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 360;
      if (nearBottom) fetchData(page + 1, true);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, loadingMore, page, totalPages, saleTypeFilter, searchQuery]);

  const parseAccessories = (val: any): Accessory[] => {
    try {
      if (!val) return [];
      if (typeof val === "string") return JSON.parse(val);
      if (Array.isArray(val)) return val;
      return [];
    } catch (e) {
      return [];
    }
  };

  const handleExportAccessories = async (id: number) => {
    const confirmed = await modal.confirm({
      title: "Yêu cầu xuất kho phụ kiện",
      message: "Hệ thống sẽ gửi yêu cầu xuất kho phụ kiện cho nhân viên kho phê duyệt. Bạn có chắc chắn?",
      type: "warning",
      confirmText: "Gửi yêu cầu",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/sales/${id}/export-accessories`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await modal.alert({
          title: "Thành công",
          message: data.message + " (Mã phiếu: " + data.orderCode + ")",
          type: "success",
        });
        fetchData(1, false);
        setSelectedVehicle((prev: any) => prev ? { ...prev, accessoriesExported: false, accessoriesExportStatus: "PENDING" } : prev);
      } else {
        await modal.alert({
          title: "Thất bại",
          message: data.error || "Gặp lỗi khi gửi yêu cầu",
          type: "error",
        });
      }
    } catch (e: any) {
      await modal.alert({
        title: "Lỗi kết nối",
        message: e.message,
        type: "error",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await modal.confirm({
      title: "Xóa hồ sơ xe",
      message: "Bạn có chắc chắn muốn xóa hồ sơ xe này không?",
      type: "danger",
      confirmText: "Xóa ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        await modal.alert({
          title: "Thành công",
          message: "Đã xóa hồ sơ xe thành công!",
          type: "success",
        });
        await fetchData(1, false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        await modal.alert({
          title: "Thất bại",
          message: errorData.error || "Lỗi khi xóa hồ sơ",
          type: "error",
        });
      }
    } catch (e: any) {
      await modal.alert({
        title: "Lỗi kết nối",
        message: e.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (vehicles: any[]) => {
    const confirmed = await modal.confirm({
      title: "Xóa hồ sơ bán buôn",
      message: `Bạn có chắc chắn muốn xóa toàn bộ hồ sơ bán buôn này gồm ${vehicles.length} xe không?`,
      type: "danger",
      confirmText: "Xóa toàn bộ",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      let successCount = 0;
      for (const v of vehicles) {
        const res = await fetch(`/api/sales/${v.id}`, { method: "DELETE" });
        if (!res.ok) {
          await modal.alert({
            title: "Thất bại",
            message: `Lỗi khi xóa hồ sơ xe ${v.model}`,
            type: "error",
          });
        } else {
          successCount++;
        }
      }
      if (successCount > 0) {
        await modal.alert({
          title: "Thành công",
          message: `Đã xóa ${successCount}/${vehicles.length} hồ sơ xe thành công!`,
          type: "success",
        });
      }
      await fetchData(1, false);
    } catch (e: any) {
      await modal.alert({
        title: "Lỗi kết nối",
        message: e.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v: any) => {
      const isReservedOrSold = v.status === "RESERVED" || v.status === "SOLD";
      if (!isReservedOrSold) return false;

      const matchesSearch = 
        (v.vin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.model || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.customer?.phone || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
      const matchesPlate = plateFilter === "ALL" || (v.plateStatus || "PENDING") === plateFilter;
      const matchesSaleType = (v.saleType || "RETAIL") === saleTypeFilter;

      return matchesSearch && matchesStatus && matchesPlate && matchesSaleType;
    });
  }, [vehicles, searchQuery, statusFilter, plateFilter, saleTypeFilter]);

  const groupedWholesale = useMemo(() => {
    if (saleTypeFilter !== "WHOLESALE") return [];
    const groups: Record<string, any> = {};
    filteredVehicles.forEach((v: any) => {
      const dateKey = v.updatedAt ? new Date(v.updatedAt).toISOString().split('T')[0] : "unknown";
      const key = v.customerId ? `${v.customerId}_${dateKey}` : `v_${v.id}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          customer: v.customer,
          vehicles: [],
          totalPaid: 0,
          totalDebt: 0,
          date: dateKey,
          status: v.status
        };
      }
      groups[key].vehicles.push(v);
      groups[key].totalPaid += Number(v.paidAmount || 0);
      groups[key].totalDebt += Number(v.debtAmount || 0);
    });
    return Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [filteredVehicles, saleTypeFilter]);

  return (
    <div className="space-y-6 stagger">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Quản trị bán hàng
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Hồ sơ & Thủ tục
          </h2>
          </div>

        <Link
          href="/sales/documents/new"
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <Plus size={16} /> Tạo Hồ sơ mới
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex">
        <button
          onClick={() => setSaleTypeFilter("RETAIL")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            saleTypeFilter === "RETAIL"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Hồ sơ Bán Lẻ
        </button>
        <button
          onClick={() => setSaleTypeFilter("WHOLESALE")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            saleTypeFilter === "WHOLESALE"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Hồ sơ Bán Buôn
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Tìm theo số khung (VIN), dòng xe, tên hoặc SĐT khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none shadow-sm"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none shadow-sm h-10"
            >
              <option value="ALL">Tất cả xe thủ tục</option>
              <option value="RESERVED">Đã Đặt Cọc</option>
              <option value="SOLD">Đã Bán</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Thủ tục biển:</span>
            <select
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/30 outline-none shadow-sm h-10"
            >
              <option value="ALL">Tất cả thủ tục</option>
              <option value="PENDING">Chờ nộp thuế (Đợi biển)</option>
              <option value="TAX_PAID">Đã nộp thuế trước bạ</option>
              <option value="PLATE_DONE">Đã bấm biển & Bàn giao xe</option>
            </select>
          </div>
        </div>
      </div>



      {/* Vehicles Procedures Table */}
      {saleTypeFilter === "WHOLESALE" ? (
        <div className="space-y-4">
          {groupedWholesale.map((group: any) => (
            <div key={group.id} className="glass-card rounded-2xl p-6 border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {group.customer?.name?.[0]?.toUpperCase() || "K"}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      {group.customer?.name || "Khách hàng mua buôn"}
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                        Bán buôn
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      SĐT: {group.customer?.phone || "Chưa có"}
                      {group.customer?.address ? ` • Địa chỉ: ${group.customer.address}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ngày tạo</div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {new Date(group.date).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteGroup(group.vehicles)}
                    className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors ml-2"
                    title="Xóa hồ sơ bán buôn"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
                {/* Vehicles list (takes 2 cols) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
                    Danh sách xe xuất buôn ({group.vehicles.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.vehicles.map((v: any) => (
                      <div key={v.id} className="p-3 bg-secondary/10 hover:bg-secondary/20 transition-all rounded-xl border border-border/50 flex flex-col justify-between h-full">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-xs text-foreground">{v.model}</span>
                            {v.status === "SOLD" ? (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                Đã Bán
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                                Đã Cọc
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1.5 font-mono">VIN: {v.vin}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {v.variant ? `${v.variant} • ` : ""}{v.color || "Khác"}{v.year ? ` • ${v.year}` : ""}
                          </div>
                        </div>
                        
                        <div className="flex justify-end items-center gap-1.5 mt-3 pt-2 border-t border-border/30">
                          <button onClick={() => openDetailModal(v)} className="p-1 hover:bg-blue-500/10 rounded text-blue-500 transition-colors" title="Xem chi tiết"><Eye size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Stats (takes 1 col) */}
                <div className="bg-secondary/5 p-4 rounded-xl border border-border flex flex-col justify-between h-full">
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      Thông tin thanh toán
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Đã thanh toán:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(group.totalPaid)}</span>
                      </div>
                      <div className="w-full h-px bg-border/60"></div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Còn nợ:</span>
                        <span className="font-bold text-rose-600">{formatCurrency(group.totalDebt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                    <button
                      onClick={() => openGroupPaymentModal(group)}
                      className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <DollarSign size={14} /> Cập nhật thanh toán
                    </button>
                    {group.totalDebt > 0 ? (
                      <div className="text-[10px] text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg font-bold text-center uppercase tracking-wider">
                        Chưa thanh toán hết ({formatCurrency(group.totalDebt)})
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg font-bold text-center uppercase tracking-wider">
                        Đã thanh toán đủ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {groupedWholesale.length === 0 && (
            <div className="glass-card rounded-xl p-12 text-center text-muted-foreground italic border border-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-primary font-bold">
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang tải danh sách hồ sơ bán buôn...
                </div>
              ) : (
                "Không tìm thấy hồ sơ bán buôn nào phù hợp."
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20 text-muted-foreground font-bold">
                <th className="p-4">Số khung (VIN)</th>
                <th className="p-4">Dòng xe & Phiên bản</th>
                <th className="p-4">Khách hàng mua</th>
                <th className="p-4">Tiến độ Ngân hàng (Trả góp)</th>
                <th className="p-4">Thủ tục Bấm biển</th>
                <th className="p-4">Thanh toán & Công nợ</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.map((v: any) => {
                const plateCostVal = Number(v.plateCost || 0);
                const accessoriesList = parseAccessories(v.accessoriesJson);
                const notesText = v.notes || "";
                return (
                  <tr key={v.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-foreground">{v.vin}</div>
                      {v.createdAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Ngày tạo: {new Date(v.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-foreground">{v.model}</div>
                        {v.status === "SOLD" ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                            Đã Bán
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                            Đã Cọc
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {v.variant} • {v.color || "Khác"} • {v.year}
                      </div>
                    </td>
                    <td className="p-4">
                      {v.customer ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <User size={12} className="text-muted-foreground" />
                            {v.customer.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold">SĐT: {v.customer.phone}</div>
                          {v.customer.birthday && (
                            <div className="text-[10px] text-muted-foreground italic">
                              Sinh: {formatDate(v.customer.birthday)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Chưa gắn khách</span>
                      )}
                    </td>
                    <td className="p-4">
                      {v.bankStatus === "NONE" ? (
                        <span className="badge bg-secondary text-muted-foreground border-none text-[10px] font-bold py-1 px-2 rounded-full">
                          Mua thẳng (Không vay)
                        </span>
                      ) : v.bankStatus === "PENDING_APPROVAL" ? (
                        <span className="badge bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Chờ phê duyệt hồ sơ vay
                        </span>
                      ) : v.bankStatus === "APPROVED" ? (
                        <span className="badge bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Đã phê duyệt vay
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Đã giải ngân tiền
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {(v.plateStatus || "PENDING") === "PENDING" ? (
                        <span className="badge bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold py-1 px-2 rounded-full whitespace-nowrap">
                          Chờ nộp thuế (Đợi biển)
                        </span>
                      ) : (v.plateStatus || "PENDING") === "TAX_PAID" ? (
                        <span className="badge bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold py-1 px-2 rounded-full whitespace-nowrap">
                          Đã nộp thuế trước bạ
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-1 px-2 rounded-full whitespace-nowrap">
                          Đã bấm biển & Bàn giao
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          Đã trả: <span className="text-emerald-600 font-bold">{formatCurrency(Number(v.paidAmount || 0))}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          Còn nợ: <span className="text-rose-600 font-bold">{formatCurrency(Number(v.debtAmount || 0))}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openDetailModal(v)}
                          className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openPaymentModal(v)}
                          className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-500 transition-colors"
                          title="Cập nhật thanh toán"
                        >
                          <DollarSign size={14} />
                        </button>
                        <Link
                          href={`/sales/documents/edit/${v.id}`}
                          className="p-1.5 hover:bg-secondary rounded-lg text-primary transition-colors"
                          title="Sửa hồ sơ"
                        >
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-colors"
                          title="Xóa hồ sơ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground italic">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-primary font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" /> Đang tải danh sách hồ sơ xe...
                      </div>
                    ) : (
                      "Không tìm thấy hồ sơ xe đặt cọc hoặc đã bán nào phù hợp."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thêm hồ sơ...
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Cập nhật thanh toán</h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Khách hàng</p>
                <p className="font-bold">{selectedVehicle.customer?.name} ({selectedVehicle.customer?.phone})</p>
              </div>
              <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Tổng tiền xe</p>
                  <p className="font-bold text-foreground">{formatCurrency(Number(selectedVehicle.paidAmount || 0) + Number(selectedVehicle.debtAmount || 0))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground">Còn nợ</p>
                  <p className="font-bold text-rose-600">{formatCurrency(Number(selectedVehicle.debtAmount || 0))}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">
                    Khách trả thêm
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setPaymentAmount(selectedVehicle.debtAmount?.toString() || "0")}
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors"
                  >
                    Trả toàn bộ
                  </button>
                </div>
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

      {/* Detail Modal */}
      {detailModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="text-lg font-bold">Chi tiết Hồ sơ & Thủ tục</h3>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thông tin Xe</p>
                  <div>
                    <p className="font-bold text-primary">{selectedVehicle.model} {selectedVehicle.variant ? `(${selectedVehicle.variant})` : ""}</p>
                    <p className="text-xs text-muted-foreground font-mono">VIN: {selectedVehicle.vin}</p>
                    <p className="text-xs mt-1">Màu: <b>{selectedVehicle.color || "Khác"}</b> • Đời: <b>{selectedVehicle.year}</b></p>
                    {selectedVehicle.createdAt && (
                      <p className="text-xs mt-1 text-muted-foreground">Ngày tạo hồ sơ: <b>{new Date(selectedVehicle.createdAt).toLocaleString("vi-VN")}</b></p>
                    )}
                  </div>
                  <div className="pt-2">
                    <span className="text-xs font-semibold mr-2">Trạng thái:</span>
                    {selectedVehicle.status === "SOLD" ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Đã Bán</span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Đã Cọc</span>
                    )}
                  </div>
                </div>

                <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Khách hàng</p>
                  {selectedVehicle.customer ? (
                    <div>
                      <p className="font-bold text-foreground">{selectedVehicle.customer.name}</p>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">SĐT: {selectedVehicle.customer.phone}</p>
                      {selectedVehicle.customer.birthday && (
                        <p className="text-xs italic text-muted-foreground mt-1">SN: {formatDate(selectedVehicle.customer.birthday)}</p>
                      )}
                      {selectedVehicle.customer.address && (
                        <p className="text-xs text-muted-foreground mt-1">Địa chỉ: {selectedVehicle.customer.address}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">Chưa có thông tin khách hàng</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">Tiến độ Ngân hàng</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedVehicle.bankStatus === "NONE" ? "Mua thẳng (Không vay)" :
                     selectedVehicle.bankStatus === "PENDING_APPROVAL" ? "Chờ phê duyệt hồ sơ vay" :
                     selectedVehicle.bankStatus === "APPROVED" ? "Đã phê duyệt vay" : "Đã giải ngân tiền"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">Thủ tục Bấm biển</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedVehicle.plateStatus === "PENDING" ? "Đợi biển / Chờ nộp thuế" :
                     selectedVehicle.plateStatus === "TAX_PAID" ? "Đã nộp thuế trước bạ" : "Đã có biển & Bàn giao"}
                  </p>
                  {Number(selectedVehicle.plateCost || 0) > 0 && (
                    <p className="text-xs font-medium text-muted-foreground">
                      Phí làm biển: <span className="text-foreground font-bold">{formatCurrency(Number(selectedVehicle.plateCost))}</span>
                    </p>
                  )}
                </div>
              </div>

              {parseAccessories(selectedVehicle.accessoriesJson).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-muted-foreground">Phụ tùng / Dịch vụ mua kèm</p>
                    {selectedVehicle.accessoriesExportStatus === "PAID" || selectedVehicle.accessoriesExported ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        Đã xuất kho
                      </span>
                    ) : selectedVehicle.accessoriesExportStatus === "PENDING" ? (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        Đang chờ kho duyệt
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {selectedVehicle.accessoriesExportStatus === "CANCELLED" && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                            Bị từ chối
                          </span>
                        )}
                        <button 
                          onClick={() => handleExportAccessories(selectedVehicle.id)}
                          className="text-[10px] bg-primary text-white font-bold px-2.5 py-1 rounded hover:bg-primary/90 transition-colors"
                        >
                          {selectedVehicle.accessoriesExportStatus === "CANCELLED" ? "Gửi lại yêu cầu" : "Xin Lệnh Xuất Kho"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-secondary/10 border border-border rounded-xl p-3">
                    <ul className="space-y-2 text-sm">
                      {parseAccessories(selectedVehicle.accessoriesJson).map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{a.name}</span>
                          <span className="text-muted-foreground text-xs">x{a.quantity} ({formatCurrency(Number(a.price))}/cái)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedVehicle.partsRequisitions && selectedVehicle.partsRequisitions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Quà tặng phụ tùng đi kèm</p>
                    {selectedVehicle.partsRequisitions[0].status === "APPROVED" ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        Đã duyệt xuất quà tặng
                      </span>
                    ) : selectedVehicle.partsRequisitions[0].status === "PENDING" ? (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        Chờ kho duyệt quà tặng
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                        Bị từ chối
                      </span>
                    )}
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <ul className="space-y-2 text-sm">
                      {selectedVehicle.partsRequisitions[0].items.map((it: any) => {
                        const prod = it.product || {};
                        const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
                        return (
                          <li key={it.id} className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{prod.name || "Sản phẩm không rõ"}</span>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">x{it.quantity}</span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded font-bold ml-1.5 font-sans">Quà tặng (0đ)</span>
                              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">({formatCurrency(Number(priceVal))})</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">Ghi chú thủ tục</p>
                {selectedVehicle.notes ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-sm italic whitespace-pre-wrap">
                    {selectedVehicle.notes}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Không có ghi chú.</p>
                )}
              </div>

              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Tổng tiền xe</p>
                  <p className="font-black text-primary text-lg">{formatCurrency(Number(selectedVehicle.paidAmount || 0) + Number(selectedVehicle.debtAmount || 0))}</p>
                </div>
                <div className="text-right flex gap-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Đã trả</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(Number(selectedVehicle.paidAmount || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Còn nợ</p>
                    <p className="font-bold text-rose-600">{formatCurrency(Number(selectedVehicle.debtAmount || 0))}</p>
                  </div>
                </div>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-border bg-secondary/5 flex justify-end">
              <button onClick={() => setDetailModalOpen(false)} className="px-5 py-2 border border-border bg-card rounded-xl text-sm font-semibold hover:bg-secondary transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
