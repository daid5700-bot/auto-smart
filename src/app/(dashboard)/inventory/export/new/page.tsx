"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { 
  Loader2, 
  Plus, 
  Search, 
  Wrench, 
  ShoppingBag, 
  X, 
  Trash2,
  ArrowLeft,
  Save
} from "lucide-react";
import { createManualExport } from "@/app/actions";
import { useAuth } from "@/lib/store";
import Link from "next/link";

export default function NewExportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [repairOrders, setRepairOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Multi-product export item list
  interface ExportItem {
    productId: string;
    quantity: number;
    priceType: "RETAIL" | "WHOLESALE" | "INSURANCE";
    customUnitPrice: string;
  }

  const [exportItems, setExportItems] = useState<ExportItem[]>([
    { productId: "", quantity: 1, priceType: "RETAIL", customUnitPrice: "" }
  ]);

  // Dropdown control state per row index
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [activeDropdownSearch, setActiveDropdownSearch] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    exportType: "RETAIL" as "RETAIL" | "REPAIR",
    repairOrderId: "",
    reason: "",
  });

  const fetchData = async () => {
    try {
      const [prodRes, roRes] = await Promise.all([
        fetch("/api/inventory?limit=1000&branchFilter=all"),
        fetch("/api/workshop"),
      ]);
      const prodData = await prodRes.json();
      const roData = await roRes.json();
      
      setProducts(prodData.products || []);
      setRepairOrders(roData.repairOrders || []);
    } catch (e) {
      console.error("Error loading export page dependencies:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (idx: number, productId: string) => {
    const prod = products.find(p => p.id === parseInt(productId));
    setExportItems(prev => {
      const updated = [...prev];
      const currentItem = updated[idx];
      const priceObj = prod?.prices?.find((p: any) => p.type === currentItem.priceType);
      updated[idx] = {
        ...currentItem,
        productId,
        customUnitPrice: priceObj ? priceObj.amount.toString() : "0"
      };
      return updated;
    });
  };

  const handlePriceTypeChange = (idx: number, priceType: "RETAIL" | "WHOLESALE" | "INSURANCE") => {
    setExportItems(prev => {
      const updated = [...prev];
      const currentItem = updated[idx];
      const prod = products.find(p => p.id === parseInt(currentItem.productId));
      const priceObj = prod?.prices?.find((p: any) => p.type === priceType);
      updated[idx] = {
        ...currentItem,
        priceType,
        customUnitPrice: priceObj ? priceObj.amount.toString() : "0"
      };
      return updated;
    });
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    setExportItems(prev => {
      const updated = [...prev];
      updated[idx].quantity = qty;
      return updated;
    });
  };

  const updateItemUnitPrice = (idx: number, price: string) => {
    setExportItems(prev => {
      const updated = [...prev];
      updated[idx].customUnitPrice = price;
      return updated;
    });
  };

  const addItemRow = () => {
    setExportItems(prev => [
      ...prev,
      { productId: "", quantity: 1, priceType: "RETAIL", customUnitPrice: "" }
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (exportItems.length === 1) return;
    setExportItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const invalidItem = exportItems.find(item => !item.productId);
    if (invalidItem) {
      alert("Vui lòng chọn phụ tùng cho tất cả các dòng");
      return;
    }

    for (const item of exportItems) {
      const prod = products.find(p => p.id === parseInt(item.productId));
      if (!prod) return;
      if (prod.stockCount < item.quantity) {
        alert(`Không đủ hàng trong kho cho sản phẩm "${prod.name}"! Hiện chỉ còn ${prod.stockCount} ${prod.unit}.`);
        return;
      }
    }

    if (formData.exportType === "REPAIR" && !formData.repairOrderId) {
      alert("Vui lòng chọn Lệnh sửa chữa (RO)");
      return;
    }

    try {
      setSubmitLoading(true);
      const res = await createManualExport({
        items: exportItems.map(item => ({
          productId: parseInt(item.productId),
          quantity: item.quantity,
          priceType: item.priceType,
          customUnitPrice: item.customUnitPrice ? parseFloat(item.customUnitPrice) : undefined,
        })),
        exportType: formData.exportType,
        repairOrderId: formData.exportType === "REPAIR" ? parseInt(formData.repairOrderId) : undefined,
        reason: formData.reason,
        createdBy: user?.name || "system",
      });

      if (res.success) {
        router.push("/inventory/export");
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi xuất kho: " + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const grandTotal = exportItems.reduce((acc, item) => {
    const qty = item.quantity || 0;
    const price = parseFloat(item.customUnitPrice || "0");
    return acc + (qty * price);
  }, 0);

  const isOutOfStock = exportItems.some(item => {
    if (!item.productId) return false;
    const prod = products.find(p => p.id === parseInt(item.productId));
    if (!prod) return false;
    return prod.stockCount < item.quantity;
  });

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
          href="/inventory/export"
          className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Lập phiếu xuất kho</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Tạo phiếu xuất bán lẻ phụ tùng hoặc lắp ráp cho xe sửa chữa tại xưởng.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-2xl shadow-xl border border-border bg-card">
        <form onSubmit={handleSubmit} className="divide-y divide-border">
          {/* Main settings */}
          <div className="p-6 space-y-5">
            {/* Export Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase">
                Phân loại xuất kho
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exportType: "RETAIL", repairOrderId: "" }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    formData.exportType === "RETAIL"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm"
                      : "border-border hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <ShoppingBag size={16} /> Xuất bán lẻ
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, exportType: "REPAIR" }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    formData.exportType === "REPAIR"
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "border-border hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <Wrench size={16} /> Xuất sửa chữa (RO)
                </button>
              </div>
            </div>

            {/* Repair Order Choice */}
            {formData.exportType === "REPAIR" && (
              <div className="animate-slide-in-bottom">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  Chọn lệnh sửa chữa (RO)
                </label>
                <select 
                  required 
                  value={formData.repairOrderId} 
                  onChange={(e) => setFormData(prev => ({ ...prev, repairOrderId: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">-- Chọn lệnh RO đang thực hiện ở xưởng --</option>
                  {repairOrders.filter((ro: any) => ro.status !== "DONE" && ro.status !== "DELIVERED").map((ro: any) => (
                    <option key={ro.id} value={ro.id}>
                      RO #{ro.id} - Biển số: {ro.plateNumber} ({ro.vehicleModel}) - Khách: {ro.customer?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Product Items List */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                Danh sách phụ tùng xuất kho
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-primary hover:text-primary-dark font-semibold flex items-center gap-1 border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-all"
              >
                <Plus size={14} /> Thêm phụ tùng
              </button>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-3 pb-2 text-xs font-bold text-muted-foreground/75 uppercase tracking-wider border-b border-border/50">
              <div className="col-span-4">Chọn phụ tùng</div>
              <div className="col-span-2">Bảng giá</div>
              <div className="col-span-2">Đơn giá bán (VND)</div>
              <div className="col-span-1">Số lượng</div>
              <div className="col-span-2 text-right">Thành tiền</div>
              <div className="col-span-1 text-center">Xóa</div>
            </div>

            <div className="space-y-3 divide-y divide-border/40 md:divide-y-0">
              {exportItems.map((item, idx) => {
                const selectedProd = products.find(p => p.id === parseInt(item.productId));
                const isRowOutOfStock = selectedProd ? selectedProd.stockCount < item.quantity : false;

                return (
                  <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 pt-3 md:pt-0 p-4 md:p-1 rounded-xl border border-border bg-secondary/5 md:bg-transparent md:border-none items-start relative animate-fade-in">
                    
                    {/* Mobile Header / Delete */}
                    <div className="flex justify-between items-center w-full md:hidden mb-1">
                      <span className="text-xs font-bold text-primary uppercase">Mặt hàng #{idx + 1}</span>
                      {exportItems.length > 1 && (
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

                    {/* Price type */}
                    <div className="w-full col-span-2">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Bảng giá</label>
                      <select
                        value={item.priceType}
                        onChange={(e) => handlePriceTypeChange(idx, e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="RETAIL">Bán lẻ (RETAIL)</option>
                        <option value="WHOLESALE">Bán sỉ (WHOLESALE)</option>
                        <option value="INSURANCE">Bảo hiểm (INSURANCE)</option>
                      </select>
                    </div>

                    {/* Custom price */}
                    <div className="w-full col-span-2">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Đơn giá bán (VND)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={item.customUnitPrice}
                        onChange={(e) => updateItemUnitPrice(idx, e.target.value)}
                        className="w-full px-2.5 py-2 bg-secondary/30 border border-border rounded-xl text-xs font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="w-full col-span-1">
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase md:hidden">Số lượng</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                          className={`w-full px-2.5 py-2 bg-secondary/30 border rounded-xl text-xs focus:ring-2 outline-none text-center ${
                            isRowOutOfStock ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-primary/20"
                          }`}
                        />
                        {selectedProd && (
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-semibold">
                            {selectedProd.unit}
                          </span>
                        )}
                      </div>
                      {isRowOutOfStock && (
                        <p className="text-red-500 text-[9px] mt-1 font-semibold block md:hidden">Hết hàng!</p>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="w-full col-span-2 text-right flex items-center justify-between md:justify-end gap-2 pr-1 md:pt-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase md:hidden">Thành tiền</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-foreground">
                          {formatCurrency((item.quantity || 0) * parseFloat(item.customUnitPrice || "0"))}
                        </span>
                        {isRowOutOfStock && (
                          <span className="text-red-500 text-[9px] font-semibold hidden md:block mt-0.5">Vượt tồn kho!</span>
                        )}
                      </div>
                    </div>

                    {/* Desktop Delete button */}
                    <div className="hidden md:flex col-span-1 justify-center md:pt-1.5">
                      {exportItems.length > 1 && (
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

          {/* Note and Reason */}
          <div className="p-6">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Lý do / Ghi chú xuất kho</label>
            <textarea 
              value={formData.reason} 
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={formData.exportType === "RETAIL" ? "Ghi chú lý do bán lẻ..." : "Ghi chú lắp đặt sửa chữa xe dịch vụ..."}
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="p-6 bg-secondary/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng trị giá phiếu xuất:</span>
              <span className="text-xl font-extrabold text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div className="flex gap-3 justify-end w-full sm:w-auto">
              <Link
                href="/inventory/export"
                className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors w-full sm:w-auto text-center"
              >
                Hủy
              </Link>
              <button 
                type="submit" 
                disabled={submitLoading || isOutOfStock}
                className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 w-full sm:w-auto"
              >
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu phiếu xuất
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
