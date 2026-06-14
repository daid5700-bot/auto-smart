"use client";
import { useEffect, useState } from "react";
import { Loader2, FileText, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export default function DocumentsPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      setVehicles((data.vehicles || []).filter((v: any) => v.status === "RESERVED" || v.status === "SOLD"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateDocStatus = async (id: number, field: string, val: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && vehicles.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Thủ tục hồ sơ xe</h2>
        <p className="text-muted-foreground text-sm mt-1">Quản lý tiến độ ngân hàng (trả góp), giải chấp, và thủ tục làm biển số của xe đặt cọc/đã bán</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Số khung (VIN)</th>
              <th>Dòng xe</th>
              <th>Khách hàng mua</th>
              <th>Tiến độ Ngân hàng</th>
              <th>Thủ tục làm biển</th>
              <th>Ghi chú thủ tục</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v: any) => (
              <tr key={v.id}>
                <td><code className="text-xs font-bold">{v.vin}</code></td>
                <td className="font-semibold">{v.model} ({v.year})</td>
                <td>{v.customer?.name || "Chưa gán khách"}</td>
                <td>
                  <select value={v.bankStatus || "NONE"} onChange={(e) => handleUpdateDocStatus(v.id, "bankStatus", e.target.value)} className="px-2 py-1 bg-secondary/30 border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none font-medium">
                    <option value="NONE">Mua thẳng (Không vay)</option>
                    <option value="PENDING_APPROVAL">Chờ phê duyệt hồ sơ vay</option>
                    <option value="APPROVED">Đã ra thông báo cho vay</option>
                    <option value="DISBURSED">Đã giải ngân tiền</option>
                  </select>
                </td>
                <td>
                  <select value={v.plateStatus || "PENDING"} onChange={(e) => handleUpdateDocStatus(v.id, "plateStatus", e.target.value)} className="px-2 py-1 bg-secondary/30 border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none font-medium">
                    <option value="PENDING">Chờ nộp thuế</option>
                    <option value="TAX_PAID">Đã nộp thuế trước bạ</option>
                    <option value="PLATE_DONE">Đã bấm biển & bàn giao</option>
                  </select>
                </td>
                <td>
                  <input type="text" defaultValue={v.notes || ""} onBlur={(e) => handleUpdateDocStatus(v.id, "notes", e.target.value)} placeholder="Nhập ghi chú thủ tục..." className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 text-xs outline-none" />
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Không có xe nào đang thực hiện thủ tục (chỉ hiển thị xe đặt cọc hoặc đã bán)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
