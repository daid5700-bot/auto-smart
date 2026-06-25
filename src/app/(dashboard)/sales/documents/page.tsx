"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Loader2, FileText, Plus, Edit, Trash2, Search, User, 
  Sparkles, Wrench, Check, Car, DollarSign, X, Eye
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Accessory {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function DocumentsPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, RESERVED, SOLD

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
    setPaymentAmount(v.paidAmount?.toString() || "0");
    setPaymentModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !paymentAmount) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/sales/vehicles/${selectedVehicle.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentAmount) }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales?limit=100");
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseAccessories = (jsonStr: string): Accessory[] => {
    try {
      if (!jsonStr) return [];
      return JSON.parse(jsonStr);
    } catch (e) {
      return [];
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ xe này không?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      } else {
        alert("Lỗi khi xóa hồ sơ");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredVehicles = vehicles.filter((v: any) => {
    const isReservedOrSold = v.status === "RESERVED" || v.status === "SOLD";
    if (!isReservedOrSold) return false;

    const matchesSearch = 
      (v.vin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.model || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.customer?.phone || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <p className="text-sm text-muted-foreground mt-1.5">
            Quản lý và thực hiện thủ tục trả góp, đăng ký bấm biển, phụ tùng đi kèm cho xe đặt cọc/đã bán.
          </p>
        </div>

        <Link
          href="/sales/documents/new"
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <Plus size={16} /> Tạo Hồ sơ mới
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Tìm theo số khung (VIN), dòng xe, tên hoặc SĐT khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/20 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          >
            <option value="ALL">Tất cả xe thủ tục</option>
            <option value="RESERVED">Đã Đặt Cọc</option>
            <option value="SOLD">Đã Bán</option>
          </select>
        </div>
      </div>

      {/* Vehicles Procedures Table */}
      <div className="glass-card rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/20 text-muted-foreground font-bold">
              <th className="p-4">Số khung (VIN)</th>
              <th className="p-4">Dòng xe & Phiên bản</th>
              <th className="p-4">Khách hàng mua</th>
              <th className="p-4">Tiến độ Ngân hàng (Trả góp)</th>
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
                  <td className="p-4 font-mono font-bold text-foreground">
                    {v.vin}
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
                    Tổng số tiền khách ĐÃ TRẢ
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setPaymentAmount((Number(selectedVehicle.paidAmount || 0) + Number(selectedVehicle.debtAmount || 0)).toString())}
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
                  value={paymentAmount === "" ? "" : Number(paymentAmount).toLocaleString("vi-VN")}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\D/g, "");
                    setPaymentAmount(cleanVal);
                  }}
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
                  <p className="text-xs font-bold text-muted-foreground mb-2">Phụ tùng / Dịch vụ mua kèm</p>
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
