"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Loader2, FileText, Plus, Edit, Trash2, Search, User, 
  Sparkles, Wrench, Check, Car
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
      return JSON.parse(jsonStr || "[]");
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
              <th className="p-4">Thủ tục biển số</th>
              <th className="p-4">Dịch vụ & Ghi chú</th>
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
                    <div className="font-bold text-foreground">{v.model}</div>
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
                      {v.plateStatus === "PENDING" ? (
                        <span className="badge bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Đợi biển / Chờ nộp thuế
                        </span>
                      ) : v.plateStatus === "TAX_PAID" ? (
                        <span className="badge bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Đã nộp thuế trước bạ
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-1 px-2 rounded-full">
                          Đã có biển & Bàn giao
                        </span>
                      )}
                      {plateCostVal > 0 && (
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          Phí làm biển: <span className="text-foreground font-bold">{formatCurrency(plateCostVal)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 max-w-[220px]">
                    <div className="space-y-1">
                      {accessoriesList.length > 0 && (
                        <div className="text-[10px]">
                          <span className="text-primary font-bold">Phụ tùng mua kèm:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {accessoriesList.map(a => (
                              <span key={a.id} className="bg-secondary/40 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-border text-foreground">
                                {a.name} x{a.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {notesText ? (
                        <div className="text-muted-foreground italic text-[10px] line-clamp-2 mt-1" title={notesText}>
                          "{notesText}"
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[10px]">Không có ghi chú.</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
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
                <td colSpan={7} className="p-12 text-center text-muted-foreground italic">
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
    </div>
  );
}
