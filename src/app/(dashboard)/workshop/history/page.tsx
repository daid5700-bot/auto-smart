"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate, statusText, statusBadge } from "@/lib/utils";
import { History, Loader2, Search } from "lucide-react";

export default function HistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/workshop");
      const data = await res.json();
      setOrders(data.repairOrders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = orders.filter((o) =>
    o.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.vehicleModel?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Lịch sử sửa chữa xe</h2>
        <p className="text-muted-foreground text-sm mt-1">Tra cứu toàn bộ lịch sử sửa chữa, bảo dưỡng của xe dịch vụ tại xưởng</p>
      </div>

      <div className="relative w-full max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm biển số, dòng xe, tên khách..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Biển số xe</th>
              <th>Dòng xe</th>
              <th>Khách hàng</th>
              <th>KTV đảm nhận</th>
              <th>Số KM</th>
              <th>Tiền công</th>
              <th>Phụ tùng</th>
              <th>Tổng chi phí</th>
              <th>Trạng thái</th>
              <th>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o: any) => (
              <tr key={o.id}>
                <td><span className="font-bold text-primary">{o.plateNumber}</span></td>
                <td className="font-semibold">{o.vehicleModel || "—"}</td>
                <td>
                  <div>
                    <p className="font-medium">{o.customer?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.customer?.phone}</p>
                  </div>
                </td>
                <td>{o.technician?.name || "Chưa giao việc"}</td>
                <td>{o.kmIn.toLocaleString()} km</td>
                <td>{formatCurrency(Number(o.laborCost))}</td>
                <td>{formatCurrency(Number(o.partsCost))}</td>
                <td className="font-bold text-primary">{formatCurrency(Number(o.totalAmount))}</td>
                <td>
                  <span className={`badge ${statusBadge(o.status)}`}>
                    {statusText(o.status)}
                  </span>
                </td>
                <td className="text-muted-foreground text-xs">{formatDate(o.updatedAt)}</td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">Không tìm thấy lịch sử phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
