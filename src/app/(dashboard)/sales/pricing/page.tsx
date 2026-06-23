"use client";
import { useEffect, useState } from "react";
import { formatCurrency, statusBadge, statusText } from "@/lib/utils";
import { DollarSign, Loader2, Edit, Check, X } from "lucide-react";

export default function VehiclePricingPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form edit price
  const [listPrice, setListPrice] = useState<number | "">(0);
  const [floorPrice, setFloorPrice] = useState<number | "">(0);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/sales");
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

  const handleStartEdit = (v: any) => {
    setEditingId(v.id);
    setListPrice(Number(v.listPrice));
    setFloorPrice(Number(v.floorPrice));
  };

  const handleSave = async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listPrice: Number(listPrice) || 0,
          floorPrice: Number(floorPrice) || 0
        }),
      });
      if (res.ok) {
        setEditingId(null);
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
        <h2 className="text-2xl font-bold">Bảng giá kinh doanh xe</h2>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình giá niêm yết (List Price) và giá bán tối thiểu (Floor Price) cho từng xe</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Số khung (VIN)</th>
              <th>Dòng xe</th>
              <th>Phiên bản</th>
              <th>Màu sắc</th>
              <th>Năm sản xuất</th>
              <th>Trạng thái</th>
              <th>Giá niêm yết (VND)</th>
              <th>Giá sàn tối thiểu (VND)</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v: any) => {
              const isEditing = editingId === v.id;
              return (
                <tr key={v.id}>
                  <td><code className="text-xs font-bold">{v.vin}</code></td>
                  <td className="font-semibold">{v.model}</td>
                  <td>{v.variant || "—"}</td>
                  <td>{v.color || "—"}</td>
                  <td>{v.year}</td>
                  <td><span className={`badge ${statusBadge(v.status)}`}>{statusText(v.status)}</span></td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                        value={listPrice === "" ? "" : Number(listPrice).toLocaleString("vi-VN")}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/\D/g, "");
                          setListPrice(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                        }}
                        className="w-32 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none font-semibold text-primary"
                      />
                    ) : (
                      <span className="font-bold text-primary">{formatCurrency(Number(v.listPrice))}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                        value={floorPrice === "" ? "" : Number(floorPrice).toLocaleString("vi-VN")}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/\D/g, "");
                          setFloorPrice(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                        }}
                        className="w-32 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none font-semibold text-success"
                      />
                    ) : (
                      <span className="font-bold text-success">{formatCurrency(Number(v.floorPrice))}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(v.id)} className="p-1.5 bg-success/10 text-success hover:bg-success/20 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartEdit(v)} className="p-1.5 hover:bg-secondary rounded text-primary flex items-center gap-1 text-xs font-semibold"><Edit size={12} /> Đổi giá</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
