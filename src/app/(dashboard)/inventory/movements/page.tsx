"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const groupMovementsIntoReceipts = (movements: any[]) => {
    const groups: Record<string, {
      id: string;
      type: string;
      createdBy: string;
      createdAt: string;
      reason: string;
      items: any[];
      totalAmount: number;
    }> = {};

    movements.forEach(m => {
      const dateVal = new Date(m.createdAt).getTime();
      const timeWindow = Math.floor(dateVal / 3000);
      const key = `${m.type}-${m.createdBy}-${timeWindow}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          type: m.type,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          reason: m.reason || "",
          items: [],
          totalAmount: 0
        };
      }
      
      groups[key].items.push(m);
      groups[key].totalAmount += Number(m.totalCost || 0);
    });

    return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getReceiptCode = (type: string, dateStr: string) => {
    const cleanDate = dateStr.replace(/\D/g, "").slice(2, 12);
    const prefix = type === "IMPORT" ? "PN" : type === "EXPORT" ? "PX" : "PK";
    return `${prefix}-${cleanDate}`;
  };

  // Form State - Array of items
  const [items, setItems] = useState<MovementItem[]>([]);

  // Dropdown UI
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/inventory?limit=1000&branchFilter=all");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error("Lỗi tải danh mục sản phẩm:", e);
    }
  };

  const fetchMovements = async (p: number) => {
    try {
      const res = await fetch(`/api/inventory/movements?page=${p}&limit=50`);
      const data = await res.json();
      setHistory(data.movements || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error("Lỗi tải lịch sử kho:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setCurrentPage(1);
    await Promise.all([fetchProducts(), fetchMovements(1)]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    resetItems();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchMovements(currentPage);
    }
  }, [currentPage]);

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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return products.slice(0, 50);
    return products.filter(p => 
      (p.name || "").toLowerCase().includes(query) ||
      (p.sku || "").toLowerCase().includes(query)
    ).slice(0, 50);
  }, [products, searchQuery]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach(p => map.set(p.id.toString(), p));
    return map;
  }, [products]);

  const groupedReceipts = useMemo(() => groupMovementsIntoReceipts(history), [history]);

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
  const grandTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitCost || 0)), 0);
  }, [items]);

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
          <div>
            
            {/* LEFT COLUMN: The list */}
            <div className="p-4 space-y-3">
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
                  const selectedProd = productMap.get(item.productId);

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">Lịch sử phiếu nhập xuất kho</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Danh sách các phiếu nhập, xuất và kiểm kê kho được gom nhóm tự động.</p>
          </div>
        </div>
        
        <div className="border border-border bg-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mã phiếu</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Thời gian</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Loại phiếu</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Người thực hiện</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Số mặt hàng</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng tiền (Nhập)</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</th>
                  <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupedReceipts.map((r: any) => {
                  const receiptCode = getReceiptCode(r.type, r.createdAt);
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedReceipt(r)}
                      className="hover:bg-primary/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary text-xs">{receiptCode}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(r.createdAt)} {new Date(r.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 uppercase rounded-md ${
                          r.type === "IMPORT" ? "bg-primary/10 text-primary" :
                          r.type === "EXPORT" ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" :
                          "bg-amber-500/10 text-amber-500"
                        }`}>
                          {r.type === "IMPORT" ? "Nhập kho" : r.type === "EXPORT" ? "Xuất kho" : "Kiểm kê"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{r.createdBy}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{r.items.length} mặt hàng</td>
                      <td className="px-4 py-3 text-xs font-bold text-foreground">
                        {r.type === "IMPORT" ? formatCurrency(r.totalAmount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">{r.reason || "—"}</td>
                      <td className="px-4 py-3 text-xs text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="px-2.5 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-white transition-all text-xs font-semibold flex items-center gap-1 mx-auto"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      Chưa có lịch sử giao dịch. Hãy tạo giao dịch đầu tiên.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
              <div className="text-xs text-muted-foreground">
                Trang <span className="font-semibold text-foreground">{currentPage}</span> / <span className="font-semibold text-foreground">{totalPages}</span>
              </div>
              <div className="flex gap-1 items-center">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                {(() => {
                  const delta = 2;
                  const range = [];
                  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                    range.push(i);
                  }
                  if (currentPage - delta > 2) range.unshift("...");
                  if (currentPage + delta < totalPages - 1) range.push("...");
                  range.unshift(1);
                  if (totalPages > 1) range.push(totalPages);

                  return range.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(Number(p))}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === p
                            ? "bg-primary text-primary-foreground font-extrabold"
                            : "border border-border bg-card hover:bg-secondary text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECEIPT DETAIL MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 print:p-0">
          <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:border-none print:shadow-none print:w-full print:max-h-full print:rounded-none">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary/10 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Chi tiết giao dịch</span>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Invoice Printable Area */}
            <div className="p-8 flex-1 overflow-y-auto print:overflow-visible space-y-6 bg-white text-zinc-900" id="printable-receipt">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-primary">AUTO-SMART CRM & ERP</h1>
                  <p className="text-xs text-zinc-500 mt-1">Hệ thống quản trị doanh nghiệp ô tô thông minh</p>
                  <p className="text-xs text-zinc-400">Chi nhánh: Mặc định</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-700">
                    {selectedReceipt.type === "IMPORT" ? "PHIẾU NHẬP KHO" : 
                     selectedReceipt.type === "EXPORT" ? "PHIẾU XUẤT KHO" : "BIÊN BẢN KIỂM KÊ"}
                  </h2>
                  <p className="font-mono font-bold text-xs text-zinc-800 mt-1">
                    Số: {getReceiptCode(selectedReceipt.type, selectedReceipt.createdAt)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Ngày lập: {formatDate(selectedReceipt.createdAt)}
                  </p>
                </div>
              </div>

              {/* Invoice Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs text-zinc-600 bg-zinc-50 p-4 rounded-xl">
                <div>
                  <p><span className="font-bold text-zinc-800">Người lập phiếu:</span> {selectedReceipt.createdBy}</p>
                  <p className="mt-1"><span className="font-bold text-zinc-800">Bộ phận:</span> Phòng phụ tùng / Kho hàng</p>
                </div>
                <div>
                  <p><span className="font-bold text-zinc-800">Hình thức:</span> {
                    selectedReceipt.type === "IMPORT" ? "Nhập tay (Manual)" : 
                    selectedReceipt.type === "EXPORT" ? "Xuất kho trực tiếp" : "Kiểm kê định kỳ"
                  }</p>
                  <p className="mt-1"><span className="font-bold text-zinc-800">Ghi chú:</span> {selectedReceipt.reason || "—"}</p>
                </div>
              </div>

              {/* Invoice Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300 text-zinc-850 font-bold">
                    <th className="py-2.5 w-10">STT</th>
                    <th className="py-2.5">Mã SKU</th>
                    <th className="py-2.5">Tên sản phẩm / phụ tùng</th>
                    <th className="py-2.5 text-center w-20">Số lượng</th>
                    <th className="py-2.5 text-center w-16">Đơn vị</th>
                    {selectedReceipt.type === "IMPORT" && (
                      <>
                        <th className="py-2.5 text-right w-28">Đơn giá</th>
                        <th className="py-2.5 text-right w-28">Thành tiền</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {selectedReceipt.items.map((m: any, idx: number) => (
                    <tr key={m.id} className="text-zinc-700">
                      <td className="py-2.5">{idx + 1}</td>
                      <td className="py-2.5 font-mono font-bold text-zinc-850">{m.product?.sku}</td>
                      <td className="py-2.5">{m.product?.name}</td>
                      <td className="py-2.5 text-center">{m.quantity}</td>
                      <td className="py-2.5 text-center">{m.product?.unit}</td>
                      {selectedReceipt.type === "IMPORT" && (
                        <>
                          <td className="py-2.5 text-right">{formatCurrency(Number(m.totalCost) / m.quantity)}</td>
                          <td className="py-2.5 text-right font-semibold text-zinc-950">{formatCurrency(Number(m.totalCost))}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              {selectedReceipt.type === "IMPORT" && (
                <div className="border-t border-zinc-300 pt-4 flex justify-between items-start">
                  <div className="text-xs text-zinc-500 italic max-w-sm">
                    * Giá trị trên đã bao gồm thuế VAT (nếu có) và được tính theo đơn giá trung bình nhập kho thực tế.
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 font-bold uppercase mr-4">Tổng cộng:</span>
                    <span className="text-lg font-black text-zinc-950">{formatCurrency(selectedReceipt.totalAmount)}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs pt-12 text-zinc-800">
                <div>
                  <p className="font-bold">Người lập phiếu</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <p className="mt-14 font-semibold">{selectedReceipt.createdBy}</p>
                </div>
                <div>
                  <p className="font-bold">Thủ kho</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <div className="mt-14" />
                </div>
                <div>
                  <p className="font-bold">Người kiểm duyệt</p>
                  <p className="text-zinc-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                  <div className="mt-14" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/15 flex justify-between items-center print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-md"
              >
                In phiếu
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-secondary border border-border text-foreground rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
