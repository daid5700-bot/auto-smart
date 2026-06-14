"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { 
  Loader2, 
  Plus, 
  Search, 
  X, 
  ArrowLeft, 
  Save, 
  Trash2
} from "lucide-react";
import { createManualImport } from "@/app/actions";
import { useAuth } from "@/lib/store";
import Link from "next/link";

export default function NewImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Multi-product import item list
  interface ImportItem {
    productId: string;
    quantity: number;
    unitCost: number;
    conversionFactor: number;
  }

  const [importItems, setImportItems] = useState<ImportItem[]>([
    { productId: "", quantity: 1, unitCost: 0, conversionFactor: 1 }
  ]);

  // Dropdown control state per row index
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [activeDropdownSearch, setActiveDropdownSearch] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/inventory?limit=1000&branchFilter=all");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductChange = (idx: number, productId: string) => {
    setImportItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        productId
      };
      return updated;
    });
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    setImportItems(prev => {
      const updated = [...prev];
      updated[idx].quantity = qty;
      return updated;
    });
  };

  const updateItemConversionFactor = (idx: number, factor: number) => {
    setImportItems(prev => {
      const updated = [...prev];
      updated[idx].conversionFactor = factor;
      return updated;
    });
  };

  const updateItemUnitCost = (idx: number, cost: number) => {
    setImportItems(prev => {
      const updated = [...prev];
      updated[idx].unitCost = cost;
      return updated;
    });
  };

  const addItemRow = () => {
    setImportItems(prev => [
      ...prev,
      { productId: "", quantity: 1, unitCost: 0, conversionFactor: 1 }
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (importItems.length === 1) return;
    setImportItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const invalidItem = importItems.find(item => !item.productId);
    if (invalidItem) {
      alert("Vui lòng chọn phụ tùng cho tất cả các dòng");
      return;
    }

    try {
      setSubmitLoading(true);
      await createManualImport({
        items: importItems.map(item => ({
          productId: parseInt(item.productId),
          quantity: item.quantity,
          unitCost: item.unitCost,
          conversionFactor: item.conversionFactor,
        })),
        createdBy: user?.name || "system",
      });
      router.push("/inventory/import");
    } catch (err) {
      console.error(err);
      alert("Lỗi nhập kho: " + (err as Error).message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Grand total calculation
  const grandTotal = importItems.reduce((acc, item) => {
    return acc + ((item.quantity || 0) * (item.unitCost || 0));
  }, 0);

  const filteredModalProducts = products.filter((p: any) => 
    (p.name || "").toLowerCase().includes(activeDropdownSearch.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(activeDropdownSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 stagger">
      {/* Header */}
      <div className="flex items-center gap-4 pb-5 border-b border-border">
        <Link
          href="/inventory/import"
          className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Lập phiếu nhập kho</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Nhập kho nhiều phụ tùng cùng lúc và tự động cập nhật số lượng tồn kho khả dụng.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-2xl shadow-xl border border-border bg-card">
        <form onSubmit={handleSubmit} className="divide-y divide-border">
          {/* Product Items List */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                Danh sách phụ tùng nhập kho
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-primary hover:text-primary-dark font-semibold flex items-center gap-1 border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-all"
              >
                <Plus size={14} /> Thêm dòng nhập
              </button>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-xs font-bold text-muted-foreground/75 uppercase tracking-wider border-b border-border/50">
              <div className="col-span-4">Chọn phụ tùng</div>
              <div className="col-span-2">Số lượng nhập</div>
              <div className="col-span-1">Quy đổi</div>
              <div className="col-span-2">Tiền vốn (VND)</div>
              <div className="col-span-2 text-right">Thành tiền</div>
              <div className="col-span-1 text-center">Xóa</div>
            </div>

            <div className="space-y-3 divide-y divide-border/40 md:divide-y-0">
              {importItems.map((item, idx) => {
                const selectedProd = products.find(p => p.id === parseInt(item.productId));

                return (
                  <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 pt-3 md:pt-0 p-4 md:p-1 rounded-xl border border-border bg-secondary/5 md:bg-transparent md:border-none items-start relative animate-fade-in">
                    
                    {/* Mobile Title & Delete Button */}
                    <div className="flex justify-between items-center w-full md:hidden mb-1">
                      <span className="text-xs font-bold text-primary uppercase">Mặt hàng #{idx + 1}</span>
                      {importItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Xóa dòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Searchable Product Dropdown */}
                    <div className="w-full col-span-4 relative">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Chọn phụ tùng</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeDropdownIdx === idx) {
                            setActiveDropdownIdx(null);
                          } else {
                            setActiveDropdownIdx(idx);
                            setActiveDropdownSearch("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs text-left focus:ring-2 focus:ring-primary/20 outline-none flex justify-between items-center transition-all hover:bg-secondary/40"
                      >
                        <span className={item.productId ? "text-foreground font-semibold truncate" : "text-muted-foreground"}>
                          {selectedProd ? `${selectedProd.name} (${selectedProd.sku})` : "-- Chọn phụ tùng --"}
                        </span>
                        <span className="text-muted-foreground text-[8px] shrink-0 ml-1">▼</span>
                      </button>

                      {selectedProd && (
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block pl-1">
                          Tồn kho: <strong className="text-foreground">{selectedProd.stockCount} {selectedProd.unit}</strong>
                        </span>
                      )}

                      {/* Backdrop */}
                      {activeDropdownIdx === idx && (
                        <div className="fixed inset-0 z-45" onClick={() => setActiveDropdownIdx(null)} />
                      )}

                      {/* Dropdown list popover */}
                      {activeDropdownIdx === idx && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-slide-in-bottom">
                          <div className="p-2 border-b border-border bg-secondary/15 flex items-center gap-2">
                            <Search size={12} className="text-muted-foreground shrink-0" />
                            <input
                              type="text"
                              placeholder="Tìm tên hoặc SKU..."
                              value={activeDropdownSearch}
                              onChange={(e) => setActiveDropdownSearch(e.target.value)}
                              className="w-full bg-transparent text-[11px] focus:outline-none border-none p-0 outline-none focus:ring-0"
                              autoFocus
                            />
                            {activeDropdownSearch && (
                              <button type="button" onClick={() => setActiveDropdownSearch("")} className="text-muted-foreground hover:text-foreground">
                                <X size={10} />
                              </button>
                            )}
                          </div>

                          <div className="overflow-y-auto max-h-40 divide-y divide-border/50">
                            {filteredModalProducts.map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleProductChange(idx, p.id.toString());
                                  setActiveDropdownIdx(null);
                                  setActiveDropdownSearch("");
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/55 transition-colors flex flex-col gap-0.5 ${
                                  item.productId === p.id.toString() ? "bg-primary/15 text-primary font-semibold" : ""
                                }`}
                              >
                                <span className="font-semibold text-foreground text-xs">{p.name}</span>
                                <span className="text-muted-foreground flex justify-between text-[9px] mt-0.5">
                                  <span>SKU: {p.sku}</span>
                                  <span>Tồn kho: <strong className="text-foreground">{p.stockCount} {p.unit}</strong></span>
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

                    {/* Quantity */}
                    <div className="w-full col-span-2">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Số lượng nhập</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                        {selectedProd && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold">
                            {selectedProd.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conversion Factor */}
                    <div className="w-full col-span-1">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Quy đổi</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={item.conversionFactor}
                        onChange={(e) => updateItemConversionFactor(idx, parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none text-center"
                      />
                    </div>

                    {/* Cost Price */}
                    <div className="w-full col-span-2">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Tiền vốn (VND)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={item.unitCost}
                        onChange={(e) => updateItemUnitCost(idx, parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 bg-secondary/30 border border-border rounded-xl text-xs font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="w-full col-span-2 text-right flex items-center justify-between md:justify-end gap-2 pr-1 md:pt-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase md:hidden">Thành tiền</span>
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency((item.quantity || 0) * (item.unitCost || 0))}
                      </span>
                    </div>

                    {/* Desktop Delete button */}
                    <div className="hidden md:flex col-span-1 justify-center md:pt-1.5">
                      {importItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                          title="Xóa dòng này"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="p-6 bg-secondary/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng giá trị phiếu nhập:</span>
              <span className="text-xl font-extrabold text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div className="flex gap-3 justify-end w-full sm:w-auto">
              <Link
                href="/inventory/import"
                className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors w-full sm:w-auto text-center"
              >
                Hủy
              </Link>
              <button 
                type="submit" 
                disabled={submitLoading}
                className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 w-full sm:w-auto"
              >
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu phiếu nhập
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
