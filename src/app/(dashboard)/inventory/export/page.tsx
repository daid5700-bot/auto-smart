"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Loader2, 
  Plus, 
  Search, 
  Wrench, 
  ShoppingBag
} from "lucide-react";

export default function ExportPage() {
  const router = useRouter();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter tabs
  const [activeTab, setActiveTab] = useState<"all" | "repair" | "retail">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/inventory/movements?type=EXPORT");
      const data = await res.json();
      setMovements(data.movements || []);
    } catch (e) {
      console.error("Error fetching export history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter movements
  const filteredMovements = movements.filter((m: any) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (m.product?.name || "").toLowerCase().includes(searchLower) ||
      (m.product?.sku || "").toLowerCase().includes(searchLower) ||
      (m.reason || "").toLowerCase().includes(searchLower) ||
      (m.createdBy || "").toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    if (activeTab === "repair") {
      return m.relatedRoId !== null;
    } else if (activeTab === "retail") {
      return m.relatedRoId === null;
    }
    return true;
  });

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Xuất kho phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý và tạo các lệnh xuất kho sửa chữa xe dịch vụ hoặc xuất kho bán lẻ
          </p>
        </div>
        <button 
          onClick={() => router.push("/inventory/export/new")} 
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"
        >
          <Plus size={16} /> Tạo lệnh xuất
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab("all")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "all" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab("repair")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "repair" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Xuất sửa chữa (RO)
          </button>
          <button 
            onClick={() => setActiveTab("retail")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "retail" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Xuất bán lẻ
          </button>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm lịch sử xuất..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* Export History Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian xuất</th>
              <th>Loại xuất</th>
              <th>SKU / Tên phụ tùng</th>
              <th>Số lượng xuất</th>
              <th>Đơn giá / Thành tiền</th>
              <th>Lệnh sửa chữa (RO)</th>
              <th>Lý do xuất</th>
              <th>Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map((m: any) => (
              <tr key={m.id}>
                <td className="text-muted-foreground text-xs">{formatDate(m.createdAt)}</td>
                <td>
                  {m.relatedRoId ? (
                    <span className="badge badge-primary text-[10px] flex items-center gap-1 w-fit">
                      <Wrench size={10} /> Sửa chữa
                    </span>
                  ) : (
                    <span className="badge text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <ShoppingBag size={10} /> Bán lẻ
                    </span>
                  )}
                </td>
                <td>
                  <code className="text-xs font-semibold text-primary block">{m.product?.sku}</code>
                  <span className="font-medium text-sm">{m.product?.name}</span>
                </td>
                <td className="text-destructive font-semibold">-{m.quantity} {m.product?.unit}</td>
                <td>
                  <div className="text-xs text-muted-foreground">{formatCurrency(Number(m.unitCost))}</div>
                  <div className="font-semibold text-sm">{formatCurrency(Number(m.totalCost))}</div>
                </td>
                <td>
                  {m.relatedRoId ? (
                    <span className="badge badge-primary text-[10px]">RO #{m.relatedRoId}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td>{m.reason || "Lắp đặt sửa chữa"}</td>
                <td className="text-muted-foreground">{m.createdBy}</td>
              </tr>
            ))}
            {filteredMovements.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy lịch sử xuất kho
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
