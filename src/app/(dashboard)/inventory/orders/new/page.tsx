"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, AlertCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatCurrency, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

interface RequisitionItemInput {
  productId: string;
  quantity: number | "";
  unitPrice: number | "";
}

export default function NewInventoryOrderPage() {
  const router = useRouter();

  // Data sources
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  
  const [type, setType] = useState("EXPORT_RETAIL");
  const [reason, setReason] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | "">("");

  // Search/Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Requisition items state
  const [items, setItems] = useState<RequisitionItemInput[]>([]);

  // Combobox search states
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/crm?tab=customers").then((r) => r.json()),
      fetch("/api/inventory?limit=100").then((r) => r.json()),
    ])
      .then(([customerData, invData]) => {
        setCustomers(customerData.customers || []);
        setProducts(invData.products || []);
      })
      .catch((e) => console.error("Error loading form dependencies:", e))
      .finally(() => setLoading(false));
  }, []);

  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    setCustomerId(""); // reset linked id if typing new phone
  };

  useEffect(() => {
    const val = phone.trim();
    if (val.trim().length > 1) {
      const timer = window.setTimeout(async () => {
        try {
          const res = await fetch(`/api/search/phone?q=${encodeURIComponent(val)}`);
          const data = await res.json();
          setSuggestions(data.customers || []);
          setShowSuggestions(true);
        } catch (e) {
          console.error(e);
        }
      }, 500);
      return () => window.clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [phone]);

  const handleSelectSuggestedCustomer = (c: any) => {
    setPhone(c.phone);
    setCustomerName(c.name);
    setCustomerId(c.id.toString());
    setShowSuggestions(false);
  };

  // Requisition items actions
  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    const priceType = type === "EXPORT_WHOLESALE" ? "WHOLESALE" : "RETAIL";
    const defaultPrice = Number(firstProduct.prices?.find((p: any) => p.type === priceType)?.amount || 0);
    setItems([
      ...items,
      {
        productId: firstProduct.id.toString(),
        quantity: 1,
        unitPrice: defaultPrice,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (openDropdownIdx === index) {
      setOpenDropdownIdx(null);
    }
  };

  const handleItemProductChange = (index: number, pId: string) => {
    const selectedProd = products.find((p) => p.id.toString() === pId);
    if (!selectedProd) return;
    const priceType = type === "EXPORT_WHOLESALE" ? "WHOLESALE" : "RETAIL";
    const defaultPrice = Number(selectedProd.prices?.find((p: any) => p.type === priceType)?.amount || 0);

    const updated = [...items];
    updated[index].productId = pId;
    updated[index].unitPrice = defaultPrice;
    setItems(updated);
  };

  const handleItemQuantityChange = (index: number, val: number | "") => {
    const updated = [...items];
    updated[index].quantity = val === "" ? "" : Math.max(1, val);
    setItems(updated);
  };

  const handleItemPriceChange = (index: number, val: number | "") => {
    const updated = [...items];
    updated[index].unitPrice = val === "" ? "" : Math.max(0, val);
    setItems(updated);
  };

  // Calculations
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const totalPartsQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 phụ tùng.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        customerId: customerId || undefined, // Send ID if selected
        phone: phone.trim(),
        customerName: customerName.trim(),
        type,
        reason,
        paidAmount: Number(paidAmount || 0),
        items: items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await fetch("/api/inventory/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gặp lỗi khi tạo đơn hàng.");
      }

      router.push("/inventory/orders");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/inventory/orders" className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">KHO PHỤ TÙNG</p>
          <h2 className="text-2xl font-bold tracking-tight">Tạo lệnh bán/xuất kho mới</h2>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs max-w-3xl animate-fade-in">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider border-b border-border/40 pb-2">
              Thông tin đơn hàng & Khách hàng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">SĐT Khách (Để trống nếu bán lẻ qua đường)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => {
                    if (phone.trim().length > 1) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập để tìm kiếm..."
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowSuggestions(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto animate-slide-in-bottom">
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectSuggestedCustomer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/80 rounded-lg text-xs transition-colors block border-b border-border/20 last:border-0"
                        >
                          <div className="font-semibold text-primary">{c.phone}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{c.name}</div>
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
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Tên KH (Tùy chọn)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Loại đơn</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="EXPORT_RETAIL">Bán Lẻ</option>
                  <option value="EXPORT_WHOLESALE">Bán Buôn</option>
                  <option value="INTERNAL">Xuất Nội Bộ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số tiền khách đã thanh toán</label>
                <NumericInput
                  value={paidAmount}
                  onChange={(c) => setPaidAmount(c === "" ? "" : parseInt(c, 10))}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 font-bold text-emerald-600 outline-none"
                  placeholder="VD: 500,000 (Để trống nếu chưa trả)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Ghi chú</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[70px]"
                placeholder="Ghi chú thêm về hóa đơn xuất..."
              />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">
                Sản phẩm xuất
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus size={13} /> Thêm sản phẩm
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10 space-y-2 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5">
                <p className="text-xs text-muted-foreground">Chưa chọn sản phẩm nào.</p>
                <button type="button" onClick={handleAddItem} className="text-xs font-semibold text-primary hover:underline">
                  Bấm để thêm sản phẩm đầu tiên
                </button>
              </div>
            ) : (
              <div className={`overflow-x-auto transition-all duration-200 ${openDropdownIdx !== null ? "min-h-[320px]" : "min-h-0"}`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold bg-secondary/15">
                      <th className="p-3">Sản phẩm (Tìm kiếm)</th>
                      <th className="p-3 w-24">Số lượng</th>
                      <th className="p-3 w-36">Đơn giá (VND)</th>
                      <th className="p-3 w-36 text-right">Thành tiền</th>
                      <th className="p-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((item, index) => {
                      const selectedProduct = products.find((p) => p.id.toString() === item.productId);

                      return (
                        <tr key={index} className="hover:bg-secondary/5 transition-colors">
                          <td className="p-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownIdx(openDropdownIdx === index ? null : index);
                                setSearchQuery("");
                              }}
                              className="w-full px-3 py-2 bg-secondary/20 border border-border/70 rounded-xl text-xs text-left outline-none flex justify-between items-center hover:bg-secondary/30 transition-colors"
                            >
                              <span className="truncate font-medium">
                                {selectedProduct
                                  ? `[${selectedProduct.sku}] ${selectedProduct.name} (Tồn: ${selectedProduct.stockCount})`
                                  : "Chọn phụ tùng..."}
                              </span>
                              <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-1.5" />
                            </button>

                            {openDropdownIdx === index && (
                              <>
                                <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(null); setSearchQuery(""); }} />
                                <div className="absolute left-2 right-2 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl p-2.5 max-h-72 overflow-hidden flex flex-col animate-slide-in-bottom">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs outline-none mb-2"
                                    placeholder="Nhập tên hoặc mã để tìm..."
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="overflow-y-auto flex-1 max-h-48 space-y-0.5">
                                    {filteredProducts.map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          handleItemProductChange(index, p.id.toString());
                                          setOpenDropdownIdx(null);
                                          setSearchQuery("");
                                        }}
                                        className={`w-full text-left px-2.5 py-2 hover:bg-secondary/80 rounded-lg text-xs transition-colors truncate block ${
                                          p.id.toString() === item.productId ? "bg-primary/10 text-primary font-semibold" : ""
                                        }`}
                                      >
                                        [{p.sku}] {p.name} (Tồn: {p.stockCount})
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </td>
                          <td className="p-2">
                            <NumericInput
                              value={item.quantity}
                              onChange={(c) => handleItemQuantityChange(index, c === "" ? "" : parseInt(c, 10))}
                              className="w-full px-2.5 py-2 bg-secondary/20 border border-border/70 rounded-xl text-xs font-semibold text-center outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <NumericInput
                              value={item.unitPrice}
                              onChange={(c) => handleItemPriceChange(index, c === "" ? "" : parseInt(c, 10))}
                              className="w-full px-2.5 py-2 bg-secondary/20 border border-border/70 rounded-xl text-xs font-semibold text-primary outline-none"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-foreground">
                            {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 space-y-6 border-l-4 border-l-primary flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">TÓM TẮT ĐƠN HÀNG</p>
                <h3 className="text-base font-bold tracking-tight mt-0.5">Tổng quan thanh toán</h3>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-bold">Tổng tiền phụ tùng:</span>
                  <span className="text-lg font-black text-primary tracking-tight">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                  <span>Đã thanh toán ngay:</span>
                  <span className="text-emerald-500 font-bold">{formatCurrency(Number(paidAmount) || 0)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-dashed border-border/40">
                  <span className="text-xs text-rose-500 font-bold">Còn nợ:</span>
                  <span className="text-sm font-bold text-rose-500">
                    {formatCurrency(Math.max(0, totalAmount - (Number(paidAmount) || 0)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border/40 pt-4 mt-4 text-[11px] text-muted-foreground/80">
              <div className="flex justify-between">
                <span>Số dòng sản phẩm:</span>
                <span className="font-bold text-foreground">{items.length} dòng</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng đơn vị xuất:</span>
                <span className="font-bold text-foreground">{totalPartsQuantity} đơn vị</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-border/40">
              <button
                type="button"
                onClick={() => router.push("/inventory/orders")}
                className="flex-1 px-4 py-2.5 border border-border hover:bg-secondary/40 rounded-xl text-xs font-semibold transition-colors text-center"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 gradient-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition-all"
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={13} /> Lưu & Xuất kho
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
