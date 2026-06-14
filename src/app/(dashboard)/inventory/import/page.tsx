"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/inventory/movements?type=IMPORT");
      const data = await res.json();
      setMovements(data.movements || []);
    } catch (e) {
      console.error("Error loading import list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nhập kho phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý lịch sử nhập phụ tùng và cập nhật số lượng tồn kho
          </p>
        </div>
        <button 
          onClick={() => router.push("/inventory/import/new")} 
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"
        >
          <Plus size={16} /> Nhập kho mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>SKU</th>
              <th>Tên phụ tùng</th>
              <th>Số lượng nhập</th>
              <th>Đơn giá vốn</th>
              <th>Tổng chi phí</th>
              <th>Người nhập</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m: any) => (
              <tr key={m.id}>
                <td className="text-muted-foreground text-xs">{formatDate(m.createdAt)}</td>
                <td><code className="text-xs font-semibold text-primary">{m.product?.sku}</code></td>
                <td className="font-medium">{m.product?.name}</td>
                <td>{m.quantity} {m.product?.unit}</td>
                <td>{formatCurrency(Number(m.unitCost))}</td>
                <td className="font-semibold">{formatCurrency(Number(m.totalCost))}</td>
                <td className="text-muted-foreground">{m.createdBy}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chưa có lịch sử nhập kho
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
