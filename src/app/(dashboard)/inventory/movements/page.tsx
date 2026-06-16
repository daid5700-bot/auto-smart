"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { 
  Loader2, ArrowDownToLine, ArrowUpFromLine, 
  SlidersHorizontal, Search, X, Plus, Trash2, Save
} from "lucide-react";
import { createManualImport, createDirectExport, createManualAdjust } from "@/app/actions";

type TabType = "IMPORT" | "EXPORT" | "ADJUST";

interface MovementItem {
  id: string; // unique local id
  productId: string;
  quantity: number;
  conversionFactor: number;
  unitCost: number; // For IMPORT
  actualStock: number; // For ADJUST
  note: string;
}

export default function MovementsPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>("IMPORT");
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State - Array of items
  const [items, setItems] = useState<MovementItem[]>([]);

  // Dropdown UI
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [prodRes, histRes] = await Promise.all([
        fetch("/api/inventory?limit=1000&branchFilter=all"),
        fetch("/api/inventory/movements?limit=20")
      ]);
      const prodData = await prodRes.json();
      const histData = await histRes.json();
      setProducts(prodData.products || []);
      setHistory(histData.movements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Initialize one row
    resetItems();
  }, []);

  const resetItems = () => {
    setItems([{
      id: crypto.randomUUID(),
      productId: "",
      quantity: 1,
      conversionFactor: 1,
      unitCost: 0,
      actualStock: 0,
      note: ""
    }]);
  };

  // When changing tabs, reset items
  useEffect(() => {
    resetItems();
  }, [activeTab]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownIdx(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = products.filter(p => 
    (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductSelect = (idx: number, productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    setItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          productId,
          actualStock: product ? product.stockCount : 0 // auto fill actualStock for ADJUST
        };
      }
      return item;
    }));
    setActiveDropdownIdx(null);
  };

  const updateItem = (idx: number, field: keyof MovementItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItemRow = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: "",
      quantity: 1,
      conversionFactor: 1,
      unitCost: 0,
      actualStock: 0,
      note: ""
    }]);
  };

  const removeItemRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidItem = items.find(i => !i.productId);
    if (invalidItem) return alert("Vui lòng chọn phụ tùng cho tất cả các dòng!");
    if (items.length === 0) return alert("Vui lòng thêm ít nhất 1 dòng!");

    setSubmitLoading(true);
    try {
      if (activeTab === "IMPORT") {
        await createManualImport({
          items: items.map(i => ({
            productId: parseInt(i.productId),
            quantity: i.quantity,
            unitCost: i.unitCost,
            conversionFactor: i.conversionFactor,
            note: i.note
          })),
          createdBy: user?.name || "system"
        });
      } else if (activeTab === "EXPORT") {
        await createDirectExport({
          items: items.map(i => ({
            productId: parseInt(i.productId),
            quantity: i.quantity,
            conversionFactor: i.conversionFactor,
            note: i.note
          })),
          createdBy: user?.name || "system"
        });
      } else if (activeTab === "ADJUST") {
        await createManualAdjust({
          items: items.map(i => ({
            productId: parseInt(i.productId),
            actualStock: i.actualStock,
            note: i.note
          })),
          createdBy: user?.name || "system"
        });
      }
      
      resetItems();
      await fetchData();
      alert("Thao tác thành công!");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Grand total calculation for IMPORT
  const grandTotal = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitCost || 0)), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className=" mx-auto space-y-6 stagger">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
          PHÒNG PHỤ TÙNG
        </p>
        <h2 className="text-3xl font-black tracking-tight">Lệnh xuất nhập kho</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Tạo phiếu xuất, nhập hoặc kiểm kê cho nhiều mã phụ tùng cùng một lúc.
        </p>
      </div>

      <div className="border border-border bg-card shadow-sm rounded-xl relative z-20">
        {/* Tabs */}
        <div className="flex border-b border-border bg-secondary/20 rounded-t-xl overflow-hidden">
          <button 
            onClick={() => setActiveTab("IMPORT")}
            className={`flex-1 py-2.5 text-xs font-bold flex justify-center items-center gap-2 transition-all ${
              activeTab === "IMPORT" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <ArrowDownToLine size={14} /> Nhập kho
          </button>
          <button 
            onClick={() => setActiveTab("EXPORT")}
            className={`flex-1 py-2.5 text-xs font-bold flex justify-center items-center gap-2 transition-all ${
              activeTab === "EXPORT" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <ArrowUpFromLine size={14} /> Xuất kho
          </button>
          <button 
            onClick={() => setActiveTab("ADJUST")}
            className={`flex-1 py-2.5 text-xs font-bold flex justify-center items-center gap-2 transition-all ${
              activeTab === "ADJUST" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <SlidersHorizontal size={14} /> Kiểm kê
          </button>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
            
            {/* LEFT COLUMN: The list */}
            <div className="p-4 space-y-3 lg:col-span-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  {activeTab === "IMPORT" ? "YÊU CẦU PHỤ TÙNG CẦN NHẬP" : 
                   activeTab === "EXPORT" ? "YÊU CẦU PHỤ TÙNG CẦN XUẤT" : "DANH SÁCH PHỤ TÙNG KIỂM KÊ"}
                </h3>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-[11px] bg-secondary text-foreground hover:bg-secondary/80 font-bold flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  <Plus size={14} /> Thêm phụ tùng
                </button>
              </div>

              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-2 px-1 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="col-span-4">Sản phẩm phụ tùng (Nhấp để tìm kiếm)</div>
                {activeTab === "ADJUST" ? (
                  <>
                    <div className="col-span-3 text-center">Tồn hệ thống</div>
                    <div className="col-span-4">Tồn thực tế</div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2">Số lượng</div>
                    <div className="col-span-2">Quy đổi</div>
                    {activeTab === "IMPORT" ? (
                      <>
                        <div className="col-span-2">Đơn giá (VND)</div>
                        <div className="col-span-1 text-right">Tổng</div>
                      </>
                    ) : (
                      <div className="col-span-3">Ghi chú</div>
                    )}
                  </>
                )}
                <div className="col-span-1 text-center">Xóa</div>
              </div>

              <div className="space-y-3 lg:space-y-1">
                {items.map((item, idx) => {
                  const selectedProd = products.find(p => p.id.toString() === item.productId);

                  return (
                    <div key={item.id} className={`flex flex-col lg:grid lg:grid-cols-12 gap-1.5 items-center bg-secondary/10 lg:bg-transparent p-3 lg:p-1 rounded-xl border border-border lg:border-none relative ${activeDropdownIdx === idx ? "z-50" : "z-10"}`}>
                      
                      {/* Product Selection */}
                      <div className="w-full lg:col-span-4 relative">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Sản phẩm phụ tùng</label>
                        <button
                          type="button"
                          onFocus={() => setFocusedIdx(idx)}
                          onClick={() => {
                            if (activeDropdownIdx === idx) {
                              setActiveDropdownIdx(null);
                            } else {
                              setActiveDropdownIdx(idx);
                              setFocusedIdx(idx);
                              setSearchQuery("");
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs text-left focus:ring-2 focus:ring-primary/20 flex justify-between items-center transition-all hover:border-primary/50"
                        >
                          <span className={item.productId ? "text-foreground font-semibold truncate" : "text-muted-foreground"}>
                            {selectedProd ? `[${selectedProd.sku}] ${selectedProd.name}` : "-- Chọn --"}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0 ml-1">▼</span>
                        </button>

                        {/* Dropdown list popover */}
                        {activeDropdownIdx === idx && (
                          <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 flex flex-col">
                            <div className="p-2 border-b border-border bg-secondary/15 flex items-center gap-2">
                              <Search size={14} className="text-muted-foreground shrink-0" />
                              <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-sm focus:outline-none border-none p-0 outline-none"
                                autoFocus
                              />
                              {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            <div className="overflow-y-auto max-h-40 py-1">
                              {filteredProducts.map((p: any) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleProductSelect(idx, p.id.toString())}
                                  className={`w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors flex justify-between items-center ${
                                    item.productId === p.id.toString() ? "bg-primary/5 text-primary" : ""
                                  }`}
                                >
                                  <div>
                                    <span className="font-bold text-sm block">{p.sku}</span>
                                    <span className="text-xs text-muted-foreground">{p.name}</span>
                                  </div>
                                  <span className="text-xs font-semibold bg-secondary px-2 py-1 rounded">Tồn: {p.stockCount}</span>
                                </button>
                              ))}
                              {filteredProducts.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {activeTab === "ADJUST" ? (
                        <>
                          <div className="w-full lg:col-span-3 lg:text-center text-lg font-bold text-muted-foreground">
                            {selectedProd ? `${selectedProd.stockCount} ${selectedProd.unit}` : "—"}
                          </div>
                          <div className="w-full lg:col-span-4">
                            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Tồn thực tế</label>
                            <input
                              type="number" required min={0}
                              onFocus={() => setFocusedIdx(idx)}
                              value={item.actualStock}
                              onChange={(e) => updateItem(idx, "actualStock", parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-amber-600"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-full lg:col-span-2">
                            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Số lượng</label>
                            <input
                              type="number" required min={1}
                              onFocus={() => setFocusedIdx(idx)}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-center"
                            />
                          </div>

                          <div className="w-full lg:col-span-2">
                            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Hệ số quy đổi</label>
                            <div className="relative">
                              <input
                                type="number" required min={1}
                                onFocus={() => setFocusedIdx(idx)}
                                value={item.conversionFactor}
                                onChange={(e) => updateItem(idx, "conversionFactor", parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none text-center pr-6"
                              />
                            </div>
                          </div>

                          {activeTab === "IMPORT" ? (
                            <>
                              <div className="w-full lg:col-span-2">
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Đơn giá</label>
                                <input
                                  type="number" required min={0}
                                  onFocus={() => setFocusedIdx(idx)}
                                  value={item.unitCost}
                                  onChange={(e) => updateItem(idx, "unitCost", parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none text-primary font-semibold"
                                />
                              </div>
                              <div className="w-full lg:col-span-1 lg:text-right font-bold text-xs">
                                <span className="lg:hidden text-xs text-muted-foreground font-normal mr-2">Tổng:</span>
                                {formatCurrency(item.quantity * item.unitCost)}
                              </div>
                            </>
                          ) : (
                            <div className="w-full lg:col-span-3">
                              <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Ghi chú</label>
                              <input
                                type="text"
                                onFocus={() => setFocusedIdx(idx)}
                                value={item.note}
                                onChange={(e) => updateItem(idx, "note", e.target.value)}
                                placeholder="Lý do xuất..."
                                className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div className="absolute right-4 top-4 lg:relative lg:right-0 lg:top-0 lg:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="p-4 bg-secondary/10 lg:col-span-4 flex flex-col justify-start">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center border border-border">
                  <SlidersHorizontal size={14} className={activeTab === "IMPORT" ? "text-primary" : activeTab === "EXPORT" ? "text-rose-500" : "text-amber-500"} />
                </div>
                <h3 className="text-xs font-bold tracking-widest uppercase">PREVIEW TRƯỚC KHI LƯU</h3>
              </div>
              
              {(() => {
                const focusedItem = items[focusedIdx] || items[0];
                const focusedProd = products.find(p => p.id.toString() === focusedItem?.productId);
                
                if (!focusedProd) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
                      <p className="text-sm font-semibold text-muted-foreground">Chọn phụ tùng để xem trước kết quả</p>
                    </div>
                  );
                }

                const finalQuantity = focusedItem.quantity * focusedItem.conversionFactor;
                let newStock = focusedProd.stockCount;
                if (activeTab === "IMPORT") newStock += finalQuantity;
                else if (activeTab === "EXPORT") newStock -= finalQuantity;
                else if (activeTab === "ADJUST") newStock = focusedItem.actualStock;

                return (
                  <div className="space-y-6">
                    <div className="flex flex-col border-l-4 pl-3 py-1 border-primary">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{focusedProd.sku}</span>
                      <span className="text-base font-bold text-foreground leading-tight">{focusedProd.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tồn hiện tại</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black">{focusedProd.stockCount}</span>
                          <span className="text-xs text-muted-foreground font-semibold">{focusedProd.unit}</span>
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Loại thao tác</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-sm font-black ${
                            activeTab === "IMPORT" ? "text-primary" :
                            activeTab === "EXPORT" ? "text-rose-500" : "text-amber-500"
                          }`}>
                            {activeTab === "IMPORT" ? "Nhập kho" : activeTab === "EXPORT" ? "Xuất kho" : "Kiểm kê"}
                          </span>
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">SL Quy đổi</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black">{finalQuantity}</span>
                          <span className="text-xs text-muted-foreground font-semibold">{focusedProd.unit}</span>
                        </div>
                      </div>
                      {activeTab === "IMPORT" && (
                        <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Giá nhập/đv</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-primary">{formatCurrency(focusedItem.unitCost)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={activeTab === "EXPORT" ? "border-rose-500/50 bg-rose-500/5 border-2 rounded-xl p-4 shadow-inner" : "border-primary/50 bg-primary/5 border-2 rounded-xl p-4 shadow-inner"}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Tồn sau thao tác</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground">{newStock}</span>
                        <span className="text-sm text-muted-foreground font-semibold ml-1">{focusedProd.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="p-4 bg-secondary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-b-xl">
            {activeTab === "IMPORT" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground uppercase">Tổng tiền phiếu nhập:</span>
                <span className="text-xl font-black text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            ) : <div />}

            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitLoading || items.length === 0}
                className={`text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider ${
                  activeTab === "IMPORT" ? "bg-primary hover:bg-primary/90 shadow-primary/20" : 
                  activeTab === "EXPORT" ? "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-800/20 dark:bg-zinc-200 dark:text-zinc-900" : 
                  "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {activeTab === "IMPORT" ? "Lưu phiếu nhập" : activeTab === "EXPORT" ? "Lưu phiếu xuất" : "Lưu kiểm kê"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* HISTORY TABLE */}
      <div className="mt-10 pt-8 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-lg">Lịch sử giao dịch (20 gần nhất)</h3>
        </div>
        <div className="border border-border bg-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Thời gian</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Loại</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Số lượng</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Thực hiện</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Lý do / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((m: any) => (
                  <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 uppercase rounded-md ${
                        m.type === "IMPORT" ? "bg-primary/10 text-primary" :
                        m.type === "EXPORT" ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" :
                        "bg-amber-500/10 text-amber-500"
                      }`}>
                        {m.type === "IMPORT" ? "Nhập" : m.type === "EXPORT" ? "Xuất" : "Kiểm kê"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs">{m.product?.sku}</td>
                    <td className={`px-4 py-3 font-bold ${
                      m.type === "IMPORT" ? "text-primary" : m.type === "EXPORT" ? "text-rose-500" : ""
                    }`}>
                      {m.type === "IMPORT" ? "+" : m.type === "EXPORT" ? "-" : ""}{m.quantity} {m.product?.unit}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.createdBy}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{m.reason || "—"}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Chưa có lịch sử. Hãy tạo giao dịch đầu tiên.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
