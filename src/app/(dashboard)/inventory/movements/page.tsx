"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { 
  Loader2, ArrowDownToLine, ArrowUpFromLine, 
  SlidersHorizontal, Search, X, Plus, Trash2, Save, DollarSign
} from "lucide-react";
import { createManualImport, createDirectExport } from "@/app/actions";

type TabType = "IMPORT" | "EXPORT";

interface MovementItem {
  id: string; // unique local id
  productId: string;
  quantity: number | "";
  conversionFactor: number | "";
  unitCost: number | ""; // For IMPORT
  note: string;
}

export default function MovementsPage() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>("IMPORT");
  const [exportType, setExportType] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Customer states
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Payment update modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [paymentInput, setPaymentInput] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const groupMovementsIntoReceipts = (movements: any[]) => {
    const groups: Record<string, {
      id: string;
      type: string;
      createdBy: string;
      createdAt: string;
      reason: string;
      items: any[];
      totalAmount: number;
      inventoryOrder?: any;
    }> = {};

    movements.forEach(m => {
      let key = "";
      if (m.inventoryOrder) {
        key = `ORDER-${m.inventoryOrder.id}`;
      } else {
        const dateVal = new Date(m.createdAt).getTime();
        const timeWindow = Math.floor(dateVal / 3000);
        key = `${m.type}-${m.createdBy}-${timeWindow}`;
      }
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          type: m.type,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          reason: m.reason || "",
          items: [],
          totalAmount: 0,
          inventoryOrder: m.inventoryOrder || null
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
      const [prodRes, custRes] = await Promise.all([
        fetch("/api/inventory?limit=1000&branchFilter=all"),
        fetch("/api/crm?tab=customers")
      ]);
      const pData = await prodRes.json();
      const cData = await custRes.json();
      setProducts(pData.products || []);
      setCustomers(cData.customers || []);
    } catch (e) {
      console.error("Lỗi tải data:", e);
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
      unitCost: "",
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
    setItems(prev => prev.map((item, i) => {
      if (i === idx) {
        const selectedProd = productMap.get(productId);
        const priceType = exportType === "WHOLESALE" ? "WHOLESALE" : "RETAIL";
        const defaultPrice = selectedProd?.prices?.find((p: any) => p.type === priceType)?.amount || 0;
        return {
          ...item,
          productId,
          unitCost: activeTab === "EXPORT" ? defaultPrice : item.unitCost
        };
      }
      return item;
    }));
    setActiveDropdownIdx(null);
  };

  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    setCustomerId("");
    if (val.trim().length > 1) {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.customers || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestedCustomer = (c: any) => {
    setPhone(c.phone);
    setCustomerName(c.name);
    setCustomerId(c.id.toString());
    if (c.address) setAddress(c.address);
    setShowSuggestions(false);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPayment || !paymentInput) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/inventory/orders/${selectedOrderForPayment.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentInput) }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        fetchMovements(currentPage);
      } else {
        const err = await res.json();
        alert("Lỗi: " + err.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingPayment(false);
    }
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
      unitCost: "",
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
            quantity: Number(i.quantity) || 0,
            unitCost: Number(i.unitCost) || 0,
            conversionFactor: Number(i.conversionFactor) || 1,
            note: i.note
          })),
          createdBy: user?.name || "system"
        });
      } else if (activeTab === "EXPORT") {
        const payload = {
          customerId: customerId || undefined,
          phone: phone.trim(),
          customerName: customerName.trim(),
          type: exportType === "WHOLESALE" ? "EXPORT_WHOLESALE" : "EXPORT_RETAIL",
          reason: items[0]?.note || "Bán xuất kho",
          address: address.trim(),
          items: items.map((i) => ({
            productId: parseInt(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitCost) || 0,
          })),
        };
        const r = await fetch("/api/inventory/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const resErr = await r.json();
          throw new Error(resErr.error || "Gặp lỗi tạo phiếu xuất.");
        }
      }
      
      resetItems();
      if (activeTab === "EXPORT") {
        setPhone("");
        setCustomerName("");
        setCustomerId("");
        setAddress("");
      }
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
    return items.reduce((acc, item) => acc + ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)), 0);
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
            type="button"
            onClick={() => setActiveTab("IMPORT")}
            className={`flex-1 py-2.5 text-xs font-bold flex justify-center items-center gap-2 transition-all ${
              activeTab === "IMPORT" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <ArrowDownToLine size={14} /> Nhập kho
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("EXPORT")}
            className={`flex-1 py-2.5 text-xs font-bold flex justify-center items-center gap-2 transition-all ${
              activeTab === "EXPORT" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <ArrowUpFromLine size={14} /> Xuất kho
          </button>
        </div>

        {activeTab === "EXPORT" && (
          <div className="p-4 bg-secondary/5 border-b border-border space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hình thức xuất:</span>
              <div className="flex bg-card border border-border rounded-lg p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExportType("RETAIL")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    exportType === "RETAIL" 
                      ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bán lẻ (Retail)
                </button>
                <button
                  type="button"
                  onClick={() => setExportType("WHOLESALE")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    exportType === "WHOLESALE" 
                      ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bán buôn (Wholesale)
                </button>
              </div>
            </div>

            {/* Customer Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">SĐT Khách (Để trống nếu khách vãng lai)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => { if (phone.trim().length > 1) setShowSuggestions(true); }}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập SĐT tìm khách..."
                />
                {showSuggestions && suggestions.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto">
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectSuggestedCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/80 rounded-lg text-xs block border-b border-border/20"
                        >
                          <div className="font-semibold text-primary">{c.phone}</div>
                          <div className="text-[10px] text-muted-foreground">{c.name}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none"
                  placeholder="Nhập tên..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none"
                  placeholder="Nhập địa chỉ..."
                />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="divide-y divide-border">
          <div>
            
            {/* LEFT COLUMN: The list */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  {activeTab === "IMPORT" ? "YÊU CẦU PHỤ TÙNG CẦN NHẬP" : "YÊU CẦU PHỤ TÙNG CẦN XUẤT"}
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
                <div className="col-span-2">Số lượng</div>
                <div className="col-span-2">Quy đổi</div>
                <div className="col-span-2">Đơn giá (VND)</div>
                <div className="col-span-1 text-right">Tổng</div>
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

                      <div className="w-full lg:col-span-2">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Số lượng</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9.]*"
                          required
                          onFocus={() => setFocusedIdx(idx)}
                          value={item.quantity === "" ? "" : Number(item.quantity).toLocaleString("vi-VN")}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            updateItem(idx, "quantity", cleanVal === "" ? "" : parseInt(cleanVal, 10));
                          }}
                          className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-center"
                        />
                      </div>

                      <div className="w-full lg:col-span-2">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Hệ số quy đổi</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            required
                            onFocus={() => setFocusedIdx(idx)}
                            value={item.conversionFactor === "" ? "" : Number(item.conversionFactor).toLocaleString("vi-VN")}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, "");
                              updateItem(idx, "conversionFactor", cleanVal === "" ? "" : parseInt(cleanVal, 10));
                            }}
                            className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none text-center"
                          />
                        </div>
                      </div>

                      <div className="w-full lg:col-span-2">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Đơn giá</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9.]*"
                          required
                          onFocus={() => setFocusedIdx(idx)}
                          value={item.unitCost === "" ? "" : Number(item.unitCost).toLocaleString("vi-VN")}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            updateItem(idx, "unitCost", cleanVal === "" ? "" : parseInt(cleanVal, 10));
                          }}
                          className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-xs focus:ring-2 focus:ring-primary/20 outline-none text-primary font-semibold"
                        />
                      </div>
                      <div className="w-full lg:col-span-1 lg:text-right font-bold text-xs">
                        <span className="lg:hidden text-xs text-muted-foreground font-normal mr-2">Tổng:</span>
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
                      </div>

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
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground uppercase">Tổng tiền:</span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={submitLoading || items.length === 0}
                className={`text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider ${
                  activeTab === "IMPORT" ? "bg-primary hover:bg-primary/90 shadow-primary/20" : 
                  "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-800/20 dark:bg-zinc-200 dark:text-zinc-900"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {activeTab === "IMPORT" ? "Lưu phiếu nhập" : "Lưu phiếu xuất"}
              </button>
            </div>
          </div>
        </form>
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
                    {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
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
                      {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
                        <>
                          <td className="py-2.5 text-right">{formatCurrency(Number(m.unitCost))}</td>
                          <td className="py-2.5 text-right font-semibold text-zinc-950">{formatCurrency(Number(m.totalCost))}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              {(selectedReceipt.type === "IMPORT" || selectedReceipt.type === "EXPORT") && (
                <div className="border-t border-zinc-300 pt-4 flex justify-between items-start">
                  <div className="text-xs text-zinc-500 italic max-w-sm">
                    {selectedReceipt.type === "IMPORT" 
                      ? "* Giá trị trên đã bao gồm thuế VAT (nếu có) và được tính theo đơn giá trung bình nhập kho thực tế."
                      : "* Giá trị xuất kho được tính dựa theo hình thức bán (Bán lẻ hoặc Bán buôn)."}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 font-bold uppercase mr-4">Tổng cộng:</span>
                    <span className="text-lg font-black text-zinc-950">{formatCurrency(selectedReceipt.items.reduce((sum: number, it: any) => sum + Number(it.totalCost || 0), 0))}</span>
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
      {/* PAYMENT UPDATE MODAL */}
      {paymentModalOpen && selectedOrderForPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Cập nhật nợ kho</h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Mã đơn</p>
                <p className="font-bold font-mono">{selectedOrderForPayment.code}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Còn nợ</p>
                <p className="text-rose-600 font-bold text-lg">{formatCurrency(Number(selectedOrderForPayment.debtAmount || 0))}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  Khách trả thêm
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  required
                  value={paymentInput === "" ? "" : Number(paymentInput).toLocaleString("vi-VN")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPaymentInput(val);
                  }}
                  className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button disabled={submittingPayment} type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {submittingPayment ? "Đang xử lý..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
