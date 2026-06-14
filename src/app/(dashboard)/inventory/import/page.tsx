"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Warehouse, Plus, Loader2, Search, X } from "lucide-react";
import { importStock } from "@/app/actions";

export default function ImportPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Searchable Product Dropdown State
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    productId: "",
    quantity: 1,
    unitCost: 0,
    conversionFactor: 1,
  });

  const fetchData = async () => {
    try {
      const [movRes, prodRes] = await Promise.all([
        fetch("/api/inventory/movements?type=IMPORT"),
        fetch("/api/inventory"),
      ]);
      const movData = await movRes.json();
      const prodData = await prodRes.json();
      setMovements(movData.movements || []);
      setProducts(prodData.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await importStock({
        productId: parseInt(formData.productId),
        quantity: Number(formData.quantity),
        unitCost: Number(formData.unitCost),
        conversionFactor: Number(formData.conversionFactor),
      });
      setModalOpen(false);
      setFormData({ productId: "", quantity: 1, unitCost: 0, conversionFactor: 1 });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Lỗi nhập kho: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProd = products.find(p => p.id === parseInt(formData.productId));

  const filteredModalProducts = products.filter((p: any) => 
    (p.name || "").toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  if (loading && movements.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nhập kho phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý lịch sử nhập phụ tùng và cập nhật số lượng tồn kho</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
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
                <td colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lịch sử nhập kho</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Nhập kho phụ tùng</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Searchable Product Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Chọn phụ tùng</label>
                
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm text-left focus:ring-2 focus:ring-primary/20 outline-none flex justify-between items-center transition-all hover:bg-secondary/40"
                >
                  <span className={selectedProd ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {selectedProd ? `${selectedProd.name} (${selectedProd.sku}) - Tồn: ${selectedProd.stockCount} ${selectedProd.unit}` : "-- Chọn phụ tùng cần nhập --"}
                  </span>
                  <span className="text-muted-foreground text-[10px]">▼</span>
                </button>

                {/* Click outside catcher */}
                {productDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />
                )}

                {/* Popover */}
                {productDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-slide-in-bottom">
                    {/* Search Field */}
                    <div className="p-2 border-b border-border bg-secondary/15 flex items-center gap-2">
                      <Search size={14} className="text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Tìm tên hoặc SKU phụ tùng..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none border-none p-0 outline-none focus:ring-0"
                      />
                      {productSearchQuery && (
                        <button type="button" onClick={() => setProductSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto max-h-40 divide-y divide-border/50">
                      {filteredModalProducts.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, productId: p.id.toString() });
                            setProductDropdownOpen(false);
                            setProductSearchQuery("");
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/55 transition-colors flex flex-col gap-0.5 ${
                            formData.productId === p.id.toString() ? "bg-primary/15 text-primary font-semibold" : ""
                          }`}
                        >
                          <span className="font-semibold text-foreground text-sm">{p.name}</span>
                          <span className="text-muted-foreground flex justify-between text-[10px] mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>Tồn: <strong className="text-foreground">{p.stockCount} {p.unit}</strong></span>
                          </span>
                        </button>
                      ))}
                      {filteredModalProducts.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy phụ tùng phù hợp</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số lượng nhập</label>
                  <input type="number" required min={1} value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Hệ số quy đổi (Thùng → Chai lẻ)</label>
                  <input type="number" required min={1} value={formData.conversionFactor} onChange={(e) => setFormData({ ...formData, conversionFactor: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tổng tiền vốn nhập (VND)</label>
                <input type="number" required min={0} value={formData.unitCost} onChange={(e) => setFormData({ ...formData, unitCost: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
