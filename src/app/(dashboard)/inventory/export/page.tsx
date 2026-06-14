"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  ClipboardList, 
  Loader2, 
  Plus, 
  Search, 
  Wrench, 
  ShoppingBag, 
  X, 
  AlertTriangle, 
  Coins,
  Trash2
} from "lucide-react";
import { createManualExport } from "@/app/actions";
import { useAuth } from "@/lib/store";

export default function ExportPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [repairOrders, setRepairOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Filter tabs
  const [activeTab, setActiveTab] = useState<"all" | "repair" | "retail">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
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
      const [movRes, prodRes, roRes] = await Promise.all([
        fetch("/api/inventory/movements?type=EXPORT"),
        fetch("/api/inventory"),
        fetch("/api/workshop"),
      ]);
      const movData = await movRes.json();
      const prodData = await prodRes.json();
      const roData = await roRes.json();
      
      setMovements(movData.movements || []);
      setProducts(prodData.products || []);
      // Only list repair orders that are not finished (or all for selection)
      setRepairOrders(roData.repairOrders || []);
    } catch (e) {
      console.error("Error fetching export page data:", e);
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
    if (exportItems.length === 1) return; // Keep at least one row
    setExportItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all items have selected product
    const invalidItem = exportItems.find(item => !item.productId);
    if (invalidItem) {
      alert("Vui lòng chọn phụ tùng cho tất cả các dòng");
      return;
    }

    // Validate stock counts
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
        setModalOpen(false);
        // Reset form
        setFormData({
          exportType: "RETAIL",
          repairOrderId: "",
          reason: "",
        });
        setExportItems([
          { productId: "", quantity: 1, priceType: "RETAIL", customUnitPrice: "" }
        ]);
        await fetchData();
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi xuất kho: " + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Grand total calculation
  const grandTotal = exportItems.reduce((acc, item) => {
    const qty = item.quantity || 0;
    const price = parseFloat(item.customUnitPrice || "0");
    return acc + (qty * price);
  }, 0);

  // Check if any items are out of stock
  const isOutOfStock = exportItems.some(item => {
    if (!item.productId) return false;
    const prod = products.find(p => p.id === parseInt(item.productId));
    if (!prod) return false;
    return prod.stockCount < item.quantity;
  });

  // Filter movements
  const filteredMovements = movements.filter((m: any) => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (m.product?.name || "").toLowerCase().includes(searchLower) ||
      (m.product?.sku || "").toLowerCase().includes(searchLower) ||
      (m.reason || "").toLowerCase().includes(searchLower) ||
      (m.createdBy || "").toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // Tab category filter
    if (activeTab === "repair") {
      return m.relatedRoId !== null;
    } else if (activeTab === "retail") {
      return m.relatedRoId === null;
    }
    return true;
  });

  // Filter products for modal dropdown search
  const filteredModalProducts = products.filter((p: any) => 
    p.status === "ACTIVE" && (
      (p.name || "").toLowerCase().includes(activeDropdownSearch.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(activeDropdownSearch.toLowerCase())
    )
  );

  if (loading && movements.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Xuất kho phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý và tạo các lệnh xuất kho sửa chữa xe dịch vụ hoặc xuất kho bán lẻ</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <Plus size={16} /> Tạo lệnh xuất
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab("all")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "all" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab("repair")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "repair" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            Xuất sửa chữa (RO)
          </button>
          <button 
            onClick={() => setActiveTab("retail")} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "retail" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
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
                <td colSpan={8} className="text-center py-8 text-muted-foreground">Không tìm thấy lịch sử xuất kho</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Export Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card z-10">
              <h3 className="text-lg font-bold">Tạo lệnh xuất kho mới</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase">Phân loại xuất kho</label>
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

                {/* Repair Order Selector (Conditional) */}
                {formData.exportType === "REPAIR" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Chọn lệnh sửa chữa (RO)</label>
                    <select 
                      required 
                      value={formData.repairOrderId} 
                      onChange={(e) => setFormData(prev => ({ ...prev, repairOrderId: e.target.value }))}
                      className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">-- Chọn lệnh RO đang thực hiện --</option>
                      {repairOrders.filter((ro: any) => ro.status !== "DONE").map((ro: any) => (
                        <option key={ro.id} value={ro.id}>
                          RO #{ro.id} - Xe: {ro.plateNumber} ({ro.vehicleModel}) - Khách: {ro.customer?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Product Selector List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase">Danh sách phụ tùng xuất</label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-xs text-primary hover:text-primary-dark font-semibold flex items-center gap-1 border border-primary/20 px-2.5 py-1.5 rounded-xl hover:bg-primary/5 transition-all"
                    >
                      <Plus size={14} /> Thêm phụ tùng
                    </button>
                  </div>

                  <div className="space-y-4 pr-1">
                    {exportItems.map((item, idx) => {
                      const selectedProd = products.find(p => p.id === parseInt(item.productId));
                      const isRowOutOfStock = selectedProd ? selectedProd.stockCount < item.quantity : false;

                      return (
                        <div key={idx} className="p-4 rounded-xl border border-border bg-secondary/5 space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-primary uppercase">Mặt hàng #{idx + 1}</span>
                            {exportItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Xóa dòng này"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          {/* Searchable Product Dropdown */}
                          <div className="relative">
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Chọn phụ tùng</label>
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
                              <span className={item.productId ? "text-foreground font-medium" : "text-muted-foreground"}>
                                {selectedProd ? `${selectedProd.name} (${selectedProd.sku}) - Tồn: ${selectedProd.stockCount} ${selectedProd.unit}` : "-- Chọn phụ tùng --"}
                              </span>
                              <span className="text-muted-foreground text-[8px]">▼</span>
                            </button>

                            {/* Click-outside catcher */}
                            {activeDropdownIdx === idx && (
                              <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownIdx(null)} />
                            )}

                            {/* Searchable dropdown popover */}
                            {activeDropdownIdx === idx && (
                              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-slide-in-bottom">
                                {/* Search Field */}
                                <div className="p-2 border-b border-border bg-secondary/15 flex items-center gap-2">
                                  <Search size={12} className="text-muted-foreground shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Tìm tên hoặc SKU phụ tùng..."
                                    value={activeDropdownSearch}
                                    onChange={(e) => setActiveDropdownSearch(e.target.value)}
                                    className="w-full bg-transparent text-[11px] focus:outline-none border-none p-0 outline-none focus:ring-0"
                                  />
                                  {activeDropdownSearch && (
                                    <button type="button" onClick={() => setActiveDropdownSearch("")} className="text-muted-foreground hover:text-foreground">
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>

                                {/* Options list */}
                                <div className="overflow-y-auto max-h-45 divide-y divide-border/50">
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

                            {selectedProd && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Cơ sở hiện tại: <span className="font-semibold text-foreground">{selectedProd.branch?.name}</span>
                              </p>
                            )}
                          </div>

                          {/* Price type and custom price */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Bảng giá áp dụng</label>
                              <select
                                value={item.priceType}
                                onChange={(e) => handlePriceTypeChange(idx, e.target.value as any)}
                                className="w-full px-2 py-1.5 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                              >
                                <option value="RETAIL">Bán lẻ (RETAIL)</option>
                                <option value="WHOLESALE">Bán sỉ (WHOLESALE)</option>
                                <option value="INSURANCE">Bảo hiểm (INSURANCE)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Đơn giá bán (VND)</label>
                              <input
                                type="number"
                                required
                                min={0}
                                value={item.customUnitPrice}
                                onChange={(e) => updateItemUnitPrice(idx, e.target.value)}
                                className="w-full px-2 py-1.5 bg-secondary/30 border border-border rounded-xl text-xs font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                              />
                            </div>
                          </div>

                          {/* Quantity and Subtotal */}
                          <div className="grid grid-cols-2 gap-3 items-end">
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Số lượng xuất</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  required
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                                  className={`w-full px-2 py-1.5 bg-secondary/30 border rounded-xl text-xs focus:ring-2 outline-none ${
                                    isRowOutOfStock ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-primary/20"
                                  }`}
                                />
                                {selectedProd && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold">
                                    {selectedProd.unit}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right pb-1">
                              <span className="text-[10px] text-muted-foreground block uppercase">Thành tiền</span>
                              <span className="text-xs font-bold text-foreground">
                                {formatCurrency((item.quantity || 0) * parseFloat(item.customUnitPrice || "0"))}
                              </span>
                            </div>
                          </div>

                          {isRowOutOfStock && (
                            <p className="text-red-500 text-[10px] flex items-center gap-1 mt-1">
                              <AlertTriangle size={12} /> Vượt quá tồn kho khả dụng!
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Lý do / Ghi chú</label>
                  <textarea 
                    value={formData.reason} 
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder={formData.exportType === "RETAIL" ? "Bán lẻ phụ tùng cho khách mang về" : "Thay thế linh kiện bảo dưỡng xe"}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
                {/* Total Calculation Display */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng giá trị đơn xuất:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="flex gap-3 justify-end w-full sm:w-auto">
                  <button 
                    type="button" 
                    disabled={submitLoading}
                    onClick={() => setModalOpen(false)} 
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40 disabled:opacity-50 w-full sm:w-auto text-center"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitLoading || isOutOfStock}
                    className="gradient-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                  >
                    {submitLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Lưu lệnh xuất
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
