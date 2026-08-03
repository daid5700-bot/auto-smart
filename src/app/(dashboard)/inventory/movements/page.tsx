"use client";

import { Suspense, useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDate, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { useAuth } from "@/lib/store";
import { useInventoryProductSearch } from "@/hooks/useInventoryProductSearch";
import {
  Loader2, ArrowDownToLine, ArrowUpFromLine,
  SlidersHorizontal, Search, X, Plus, Trash2, Save, DollarSign
} from "lucide-react";
import { createManualImport, createDirectExport } from "@/app/actions";
import { useModal } from "@/components/ModalProvider";


type TabType = "IMPORT" | "EXPORT";

interface MovementItem {
  id: string; // unique local id
  productId: string;
  quantity: number | "";
  conversionFactor: number | "";
  unitCost: number | ""; // For IMPORT
  note: string;
  product?: any;
}



function MovementsPageContent() {
  const modal = useModal();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get("editId") || 0);

  const [activeTab, setActiveTab] = useState<TabType>("IMPORT");
  const [exportType, setExportType] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Customer states
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [address, setAddress] = useState("");
  const [customerDebt, setCustomerDebt] = useState(0);
  const [customerDebtLoading, setCustomerDebtLoading] = useState(false);
  const [originalOrderDebt, setOriginalOrderDebt] = useState(0);
  const [originalPaidAmount, setOriginalPaidAmount] = useState(0);
  const [originalCustomerId, setOriginalCustomerId] = useState("");
  const [editLoading, setEditLoading] = useState(editId > 0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const searchTimeoutRef = useRef<any>(null);

  // Form State - Array of items
  const [items, setItems] = useState<MovementItem[]>([]);

  // Dropdown UI
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    results: filteredProducts,
    products,
    productMap,
    loading: productsLoading,
    error: productsError,
    refresh: refreshProducts,
  } = useInventoryProductSearch({
    query: searchQuery,
    limit: 50,
  });

  useEffect(() => {
    if (!editId) resetItems();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [editId]);

  function resetItems() {
    setItems([{
      id: crypto.randomUUID(),
      productId: "",
      quantity: 1,
      conversionFactor: 1,
      unitCost: "",
      note: ""
    }]);
  }

  // When changing tabs, reset items
  useEffect(() => {
    if (!editId) resetItems();
  }, [activeTab, editId]);

  useEffect(() => {
    if (!editId) return;

    const controller = new AbortController();
    setEditLoading(true);
    fetch(`/api/inventory/orders/${editId}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể tải phiếu xuất kho.");

        setActiveTab("EXPORT");
        setExportType(data.type === "EXPORT_WHOLESALE" ? "WHOLESALE" : "RETAIL");
        setPhone(data.customer?.phone || "");
        setCustomerName(data.customer?.name || "");
        setCustomerId(data.customer?.id ? String(data.customer.id) : "");
        setOriginalCustomerId(data.customer?.id ? String(data.customer.id) : "");
        setAddress(data.customer?.address || "");
        setOriginalOrderDebt(Number(data.debtAmount || 0));
        setOriginalPaidAmount(Number(data.paidAmount || 0));
        setItems((data.movements || []).map((movement: any) => ({
          id: crypto.randomUUID(),
          productId: String(movement.productId),
          quantity: Number(movement.quantity || 0),
          conversionFactor: 1,
          unitCost: Number(movement.unitCost || 0),
          note: movement.reason || data.reason || "",
          product: movement.product,
        })));
      })
      .catch(async (error) => {
        if (error?.name !== "AbortError") {
          await modal.alert({
            title: "Không thể sửa phiếu",
            message: error.message,
            type: "error",
          });
          router.replace("/inventory/history?tab=EXPORT");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setEditLoading(false);
      });

    return () => controller.abort();
  }, [editId, modal, router]);

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

  const handleProductSelect = (idx: number, productId: string) => {
    const selectedProduct = productMap.get(productId);
    if (activeTab === "EXPORT" && Number(selectedProduct?.stockCount || 0) <= 0) {
      return;
    }
    setItems(prev => prev.map((item, i) => {
      if (i === idx) {
        const selectedProd = selectedProduct;
        const priceType = exportType === "WHOLESALE" ? "WHOLESALE" : "RETAIL";
        const defaultPrice = selectedProd?.prices?.find((p: any) => p.type === priceType)?.amount || 0;
        return {
          ...item,
          productId,
          unitCost: activeTab === "EXPORT" ? defaultPrice : item.unitCost,
          product: selectedProd,
        };
      }
      return item;
    }));
    setActiveDropdownIdx(null);
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setCustomerId("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (val.trim().length > 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search/phone?q=${encodeURIComponent(val)}`);
          const data = await res.json();
          setSuggestions(data.customers || []);
          setShowSuggestions(true);
        } catch (e) {
          console.error(e);
        }
      }, 500);
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

  useEffect(() => {
    if (!customerId || activeTab !== "EXPORT") {
      setCustomerDebt(0);
      setCustomerDebtLoading(false);
      return;
    }

    const controller = new AbortController();
    setCustomerDebtLoading(true);
    fetch(`/api/crm/${customerId}/debt-summary`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể tải công nợ khách hàng.");
        const editedOrderDebt = customerId === originalCustomerId ? originalOrderDebt : 0;
        setCustomerDebt(Math.max(0, Number(data.inventoryDebt || 0) - editedOrderDebt));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error(error);
          setCustomerDebt(0);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCustomerDebtLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, customerId, originalCustomerId, originalOrderDebt]);



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
    if (invalidItem) {
      await modal.alert({
        title: "Thiếu thông tin",
        message: "Vui lòng chọn phụ tùng cho tất cả các dòng!",
        type: "warning",
      });
      return;
    }
    if (items.length === 0) {
      await modal.alert({
        title: "Thiếu thông tin",
        message: "Vui lòng thêm ít nhất 1 dòng!",
        type: "warning",
      });
      return;
    }

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
          paidAmount: editId ? originalPaidAmount : 0,
          items: items.map((i) => ({
            productId: parseInt(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitCost) || 0,
          })),
        };
        const r = await fetch(editId ? `/api/inventory/orders/${editId}` : "/api/inventory/orders", {
          method: editId ? "PATCH" : "POST",
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
      refreshProducts();
      if (editId) {
        router.push("/inventory/history?tab=EXPORT");
        router.refresh();
        return;
      }
      await modal.alert({
        title: "Thành công",
        message: "Thao tác xuất nhập kho thành công!",
        type: "success",
      });
    } catch (err: any) {
      await modal.alert({
        title: "Thất bại",
        message: err.message || "Gặp lỗi khi lưu phiếu kho",
        type: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Grand total calculation for IMPORT
  const grandTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)), 0);
  }, [items]);
  const currentOrderDebt = Math.max(0, grandTotal - originalPaidAmount);
  const totalCustomerDebt = customerDebt + currentOrderDebt;

  if (editLoading || (productsLoading && products.length === 0)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className=" mx-auto space-y-6 stagger">

      <div className="border border-border bg-card shadow-sm rounded-xl relative z-20">
        {/* Tabs */}
        <div className="flex border-b border-border bg-secondary/20 rounded-t-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("IMPORT")}
            disabled={Boolean(editId)}
            className={`flex-1 py-2.5 text-sm font-bold flex justify-center items-center gap-2 transition-all ${activeTab === "IMPORT" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/40"
              } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <ArrowDownToLine size={16} /> Nhập kho
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EXPORT")}
            className={`flex-1 py-2.5 text-sm font-bold flex justify-center items-center gap-2 transition-all ${activeTab === "EXPORT" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-muted-foreground hover:bg-secondary/40"
              }`}
          >
            <ArrowUpFromLine size={16} /> Xuất kho
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
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${exportType === "RETAIL"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Bán lẻ (Retail)
                </button>
                <button
                  type="button"
                  onClick={() => setExportType("WHOLESALE")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${exportType === "WHOLESALE"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Bán buôn (Wholesale)
                </button>
              </div>
            </div>

            {/* Customer Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-border/50 pt-5">
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">SĐT Khách (Để trống nếu khách vãng lai)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => { if (phone.trim().length > 1) setShowSuggestions(true); }}
                  className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
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
                          className="w-full text-left px-3 py-2.5 hover:bg-secondary/80 rounded-lg text-xs block border-b border-border/20"
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
                  className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none font-medium"
                  placeholder="Nhập tên..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-3 bg-card border border-border rounded-xl text-sm outline-none font-medium"
                  placeholder="Nhập địa chỉ..."
                />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="divide-y divide-border">
          <div>

            {/* LEFT COLUMN: The list */}
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  {activeTab === "IMPORT"
                    ? "YÊU CẦU PHỤ TÙNG CẦN NHẬP"
                    : editId
                      ? "CHỈNH SỬA PHIẾU XUẤT PHỤ TÙNG"
                      : "YÊU CẦU PHỤ TÙNG CẦN XUẤT"}
                </h3>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs bg-secondary text-foreground hover:bg-secondary/80 font-bold flex items-center gap-1.5 border border-border px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Plus size={16} /> Thêm phụ tùng
                </button>
              </div>

              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-2 px-1 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="col-span-5">Sản phẩm phụ tùng (Nhấp để tìm kiếm)</div>
                <div className="col-span-1 text-center">Số lượng</div>
                <div className="col-span-1 text-center">Quy đổi</div>
                <div className="col-span-2">Đơn giá (VND)</div>
                <div className="col-span-2 text-right">Tổng tiền</div>
                <div className="col-span-1 text-center">Xóa</div>
              </div>

              <div className="space-y-3 lg:space-y-1">
                {items.map((item, idx) => {
                  const selectedProd = productMap.get(item.productId) || item.product;

                  return (
                    <div key={item.id} className={`flex flex-col lg:grid lg:grid-cols-12 gap-4 items-center bg-secondary/10 lg:bg-transparent p-3 lg:py-3.5 lg:px-2 rounded-xl border border-border lg:border-none relative ${activeDropdownIdx === idx ? "z-50" : "z-10"}`}>

                      {/* Product Selection */}
                      <div className="w-full lg:col-span-5 relative">
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
                          className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-xs text-left focus:ring-2 focus:ring-primary/20 flex justify-between items-center transition-all hover:border-primary/50"
                        >
                          <span className={item.productId ? "text-foreground font-bold truncate" : "text-muted-foreground"}>
                            {selectedProd ? `[${selectedProd.sku}] ${selectedProd.name}` : "-- Chọn --"}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0 ml-1">▼</span>
                        </button>

                        {/* Dropdown list popover */}
                        {activeDropdownIdx === idx && (
                          <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 flex flex-col">
                            <div className="p-2.5 border-b border-border bg-secondary/15 flex items-center gap-2">
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
                              {filteredProducts.map((p: any) => {
                                const isOutOfStock = activeTab === "EXPORT" && Number(p.stockCount || 0) <= 0;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => handleProductSelect(idx, p.id.toString())}
                                    className={`w-full text-left px-3 py-2.5 transition-colors flex justify-between items-center ${
                                      isOutOfStock
                                        ? "opacity-55 cursor-not-allowed"
                                        : "hover:bg-secondary/50"
                                    } ${item.productId === p.id.toString() ? "bg-primary/5 text-primary" : ""
                                      }`}
                                  >
                                    <div>
                                      <span className="font-bold text-sm block">{p.sku}</span>
                                      <span className="text-xs text-muted-foreground">{p.name}</span>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                      isOutOfStock ? "bg-rose-500/10 text-rose-600" : "bg-secondary"
                                    }`}>
                                      {isOutOfStock ? "Hết hàng" : `Tồn: ${p.stockCount}`}
                                    </span>
                                  </button>
                                );
                              })}
                              {productsLoading && (
                                <div className="p-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                                  <Loader2 size={14} className="animate-spin" /> Đang tìm phụ tùng...
                                </div>
                              )}
                              {!productsLoading && productsError && (
                                <div className="p-4 text-center text-xs text-destructive">{productsError}</div>
                              )}
                              {!productsLoading && !productsError && filteredProducts.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-full lg:col-span-1">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Số lượng</label>
                        <NumericInput
                          required
                          value={item.quantity}
                          onChange={(c) => updateItem(idx, "quantity", c === "" ? "" : parseInt(c, 10))}
                          className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-center"
                        />
                      </div>

                      <div className="w-full lg:col-span-1">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Quy đổi</label>
                        <div className="relative">
                          <NumericInput
                            required
                            value={item.conversionFactor}
                            onChange={(c) => updateItem(idx, "conversionFactor", c === "" ? "" : parseInt(c, 10))}
                            className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none text-center"
                          />
                        </div>
                      </div>

                      <div className="w-full lg:col-span-2">
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase lg:hidden">Đơn giá</label>
                        <NumericInput
                          required
                          value={item.unitCost}
                          onChange={(c) => updateItem(idx, "unitCost", c === "" ? "" : parseInt(c, 10))}
                          className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none text-primary font-bold text-right"
                        />
                      </div>
                      <div className="w-full lg:col-span-2 lg:text-right font-bold text-sm text-foreground">
                        <span className="lg:hidden text-xs text-muted-foreground font-normal mr-2">Tổng:</span>
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
                      </div>

                      <div className="absolute right-4 top-4 lg:relative lg:right-0 lg:top-0 lg:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
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

          <div className="p-6 bg-secondary/20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 rounded-b-xl">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground uppercase">Tổng tiền:</span>
                <span className="text-2xl font-black text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {activeTab === "EXPORT" && customerId && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="min-w-40 rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Tiền phiếu xuất</p>
                    <p className="mt-0.5 text-sm font-black text-primary">{formatCurrency(grandTotal)}</p>
                  </div>
                  <div className="min-w-40 rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Nợ cũ</p>
                    <p className="mt-0.5 text-sm font-black text-amber-600">
                      {customerDebtLoading ? "Đang tải..." : formatCurrency(customerDebt)}
                    </p>
                  </div>
                  <div className="min-w-48 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-rose-600">Tổng công nợ sau phiếu</p>
                    <p className="mt-0.5 text-sm font-black text-rose-600">
                      {customerDebtLoading ? "—" : formatCurrency(totalCustomerDebt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitLoading || items.length === 0}
                className={`text-white px-6 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-wider ${activeTab === "IMPORT" ? "bg-primary hover:bg-primary/90 shadow-primary/20" :
                  "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-800/20 dark:bg-zinc-200 dark:text-zinc-900"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {activeTab === "IMPORT" ? "Lưu phiếu nhập" : editId ? "Lưu thay đổi" : "Lưu phiếu xuất"}
              </button>
            </div>
          </div>
        </form>
      </div>






    </div>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <MovementsPageContent />
    </Suspense>
  );
}
