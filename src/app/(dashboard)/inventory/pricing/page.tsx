"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Loader2, Edit2, Check, X } from "lucide-react";

export default function PricingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Editing Prices State
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [insurancePrice, setInsurancePrice] = useState(0);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartEdit = (p: any) => {
    setEditingId(p.id);
    const retail = p.prices.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
    const wholesale = p.prices.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
    const insurance = p.prices.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;
    setRetailPrice(Number(retail));
    setWholesalePrice(Number(wholesale));
    setInsurancePrice(Number(insurance));
  };

  const handleSave = async (productId: number) => {
    try {
      setLoading(true);
      const prices = [
        { type: "RETAIL", amount: retailPrice },
        { type: "WHOLESALE", amount: wholesalePrice },
        { type: "INSURANCE", amount: insurancePrice },
      ];
      const res = await fetch(`/api/inventory/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
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

  if (loading && products.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Bảng giá phụ tùng</h2>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình đa bảng giá (Giá bán lẻ, Giá bán buôn/đại lý, Giá bảo hiểm)</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Tên phụ tùng</th>
              <th>Đơn vị</th>
              <th>Giá Bán Lẻ</th>
              <th>Giá Bán Buôn (Đại lý)</th>
              <th>Giá Bảo Hiểm</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => {
              const isEditing = editingId === p.id;
              const retail = p.prices.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
              const wholesale = p.prices.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
              const insurance = p.prices.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;

              return (
                <tr key={p.id}>
                  <td><code className="text-xs font-semibold text-primary">{p.sku}</code></td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-muted-foreground">{p.unit}</td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={retailPrice} onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
                    ) : (
                      <span className="font-semibold text-primary">{formatCurrency(Number(retail))}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(parseInt(e.target.value) || 0)} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
                    ) : (
                      <span className="font-semibold text-success">{formatCurrency(Number(wholesale))}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="number" value={insurancePrice} onChange={(e) => setInsurancePrice(parseInt(e.target.value) || 0)} className="w-28 px-2 py-1 bg-secondary/30 border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
                    ) : (
                      <span className="font-semibold text-purple-600">{formatCurrency(Number(insurance))}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(p.id)} className="p-1.5 bg-success/10 text-success hover:bg-success/20 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartEdit(p)} className="p-1.5 hover:bg-secondary rounded text-primary flex items-center gap-1 text-xs font-semibold"><Edit2 size={12} /> Sửa giá</button>
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
