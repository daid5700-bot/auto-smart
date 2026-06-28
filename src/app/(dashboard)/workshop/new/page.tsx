"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, AlertCircle, ChevronDown, X, User } from "lucide-react";
import Link from "next/link";
import { formatCurrency, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { useAuth } from "@/lib/store";

interface RequisitionItemInput {
  productId: string;
  quantity: number | "";
  unitPrice: number | "";
}

export default function NewRepairOrderPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Data sources
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [kmIn, setKmIn] = useState<number | "">("");
  const [technicianId, setTechnicianId] = useState("");
  const [laborCost, setLaborCost] = useState<number | "">("");
  const [symptoms, setSymptoms] = useState("");
  const [carCondition, setCarCondition] = useState("");

  // Search/Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [matchedPlates, setMatchedPlates] = useState<string[]>([]);

  // Loyalty states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number | "">("");

  // Requisition items state
  const [items, setItems] = useState<RequisitionItemInput[]>([]);

  // Combobox search states
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm?tab=customers&allBranches=true").then((r) => r.json()),
      fetch("/api/technicians").then((r) => r.json()),
      fetch("/api/inventory?limit=100").then((r) => r.json()),
    ])
      .then(([customerData, techData, invData]) => {
        setCustomers(customerData.customers || []);
        setTechnicians(techData.technicians || []);
        setProducts(invData.products || []);
      })
      .catch((e) => console.error("Error loading form dependencies:", e))
      .finally(() => setLoading(false));
  }, []);

  const handlePhoneChange = async (val: string) => {
    setPhone(val);
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
    setSelectedCustomerId(c.id);
    setCustomerLoyaltyPoints(c.loyaltyPoints || 0);
    setPointsToRedeem("");
    if (c.vehiclePlates && c.vehiclePlates.length > 0) {
      setPlateNumber(c.vehiclePlates[0]);
    } else {
      setPlateNumber("");
    }
    setShowSuggestions(false);
  };

  useEffect(() => {
    const matchedCustomer = customers.find((c) => c.phone.trim() === phone.trim());
    if (matchedCustomer) {
      setSelectedCustomerId(matchedCustomer.id);
      setCustomerLoyaltyPoints(matchedCustomer.loyaltyPoints || 0);
    } else {
      setSelectedCustomerId(null);
      setCustomerLoyaltyPoints(0);
      setPointsToRedeem("");
    }
  }, [phone, customers]);

  // Requisition items actions
  const handleAddItem = () => {
    if (products.length === 0) {
      setAlertConfig({
        title: "Không tìm thấy phụ tùng",
        message: "Hiện chưa có bất kỳ sản phẩm phụ tùng nào được cấu hình trong hệ thống kho hoặc danh sách kho đang trống. Vui lòng thêm phụ tùng ở mục Quản lý kho trước."
      });
      return;
    }
    const firstProduct = products[0];
    const retailPrice = Number(firstProduct.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0);
    setItems([
      ...items,
      {
        productId: firstProduct.id.toString(),
        quantity: 1,
        unitPrice: retailPrice,
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
    const retailPrice = Number(selectedProd.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0);

    const updated = [...items];
    updated[index].productId = pId;
    updated[index].unitPrice = retailPrice;
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
  const partsCostTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const subtotal = (Number(laborCost) || 0) + partsCostTotal;
  const discountAmount = pointsToRedeem ? Number(pointsToRedeem) * 1000 : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const vatEstimate = finalTotal * 0.1;

  const totalPartsQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg("Vui lòng nhập số điện thoại khách hàng.");
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên khách hàng.");
      return;
    }
    if (!plateNumber.trim()) {
      setErrorMsg("Vui lòng nhập biển số xe.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        plateNumber: plateNumber.trim(),
        vehicleModel,
        kmIn,
        symptoms,
        carCondition,
        technicianId: technicianId || undefined,
        createdById: user?.id,
        laborCost,
        items: items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        pointsToRedeem: pointsToRedeem ? Number(pointsToRedeem) : 0,
      };

      const res = await fetch("/api/workshop/create-with-requisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gặp lỗi khi lưu lệnh sửa chữa.");
      }

      router.push("/workshop");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products based on query
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
      {/* Top action header */}
      <div className="flex items-center gap-3">
        <Link href="/workshop" className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">LỆNH SỬA CHỮA</p>
          <h2 className="text-2xl font-bold tracking-tight">Tạo lệnh sửa chữa mới</h2>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-xl border border-border/40 max-w-3xl">
        Sau khi lưu, lệnh sẽ ở trạng thái <span className="font-bold text-primary">CHỜ PHỤ TÙNG</span> (nếu có yêu cầu phụ tùng) hoặc <span className="font-bold text-success">CHỜ SỬA (PENDING)</span> (nếu không có). Kho sẽ trực tiếp xuất phụ tùng và ghi nhận lịch sử trừ kho tương ứng.
      </p>

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs max-w-3xl animate-fade-in">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main fields (Left side) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider border-b border-border/40 pb-2">
              Thông tin tiếp nhận
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SỐ ĐIỆN THOẠI */}
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số điện thoại *</label>
                <input
                  required
                  type="text"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => {
                    if (phone.trim().length > 1) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: 0912345678 (Nhập để tìm hoặc thêm mới)"
                />
                
                {/* Suggestions List */}
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
                          onClick={() => {
                            handleSelectSuggestedCustomer(c);
                            setMatchedPlates(c.vehiclePlates || []);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/80 rounded-lg text-xs transition-colors block border-b border-border/20 last:border-0"
                        >
                          <div className="font-semibold text-primary">{c.phone}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {c.name} {c.vehiclePlates?.length > 0 ? `(${c.vehiclePlates.join(", ")})` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* HỌ VÀ TÊN KHÁCH HÀNG */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên khách hàng *</label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BIẾN SỐ XE */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Biển số xe *</label>
                <div className="relative">
                  <input
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="VD: 30A-123.45"
                  />
                  {/* Quick-select if suggested customer has multiple plates */}
                  {matchedPlates.length > 0 && (
                    <div className="absolute right-2 top-1.5 flex gap-1.5">
                      {matchedPlates.map((p: string) => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setPlateNumber(p)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                            plateNumber === p ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DÒNG XE (MODEL) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Dòng xe (Model) *</label>
                <input
                  required
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: Toyota Camry 2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SỐ KM */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số KM khi vào</label>
                <NumericInput
                  required
                  value={kmIn}
                  onChange={(c) => setKmIn(c === "" ? "" : parseInt(c, 10))}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: 45.000"
                />
              </div>

              {/* KỸ THUẬT VIÊN */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Kỹ thuật viên đảm nhận</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">-- Chưa giao việc --</option>
                  {technicians.map((ktv) => (
                    <option key={ktv.id} value={ktv.id}>
                      {ktv.name} ({ktv.status === "WORKING" ? "Đang sửa" : "Đang rảnh"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TIỀN CÔNG THỢ */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tiền công thợ dự kiến</label>
                <NumericInput
                  required
                  value={laborCost}
                  onChange={(c) => setLaborCost(c === "" ? "" : parseInt(c, 10))}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="VD: 150.000"
                />
              </div>
            </div>

            {/* YÊU CẦU KHÁCH / TRIỆU CHỨNG */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Yêu cầu của khách / Triệu chứng</label>
              <textarea
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[70px]"
                placeholder="VD: Máy kêu to, bảo dưỡng 40,000 km..."
              />
            </div>

            {/* TÌNH TRẠNG XE */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tình trạng xe khi vào</label>
              <textarea
                value={carCondition}
                onChange={(e) => setCarCondition(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[70px]"
                placeholder="VD: Trầy xước nhẹ mâm xe bên phải, kính xe sạch..."
              />
            </div>
          </div>

          {/* Requisition items list */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">
                Yêu cầu phụ tùng cần xuất
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus size={13} /> Thêm phụ tùng
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10 space-y-2 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5">
                <p className="text-xs text-muted-foreground">Chưa có phụ tùng nào được thêm vào lệnh.</p>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Bấm để thêm hàng mục phụ tùng đầu tiên
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold bg-secondary/15">
                      <th className="p-3">Sản phẩm phụ tùng (Nhấp để tìm kiếm)</th>
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
                          {/* Searchable Combobox for Product */}
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

                            {/* Dropdown menu */}
                            {openDropdownIdx === index && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownIdx(null);
                                    setSearchQuery("");
                                  }}
                                />
                                <div className="absolute left-2 right-2 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl p-2.5 max-h-72 overflow-hidden flex flex-col animate-slide-in-bottom">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs outline-none mb-2"
                                    placeholder="Nhập tên hoặc mã phụ tùng cần tìm..."
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
                                    {filteredProducts.length === 0 && (
                                      <p className="text-center text-[11px] text-muted-foreground py-4">
                                        Không tìm thấy phụ tùng phù hợp
                                      </p>
                                    )}
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

        {/* Summary sidebar (Right side) */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 space-y-6 border-l-4 border-l-primary flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">TÓM TẮT BÁO GIÁ</p>
                <h3 className="text-base font-bold tracking-tight mt-0.5">Báo giá sơ bộ (ước tính)</h3>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tiền công thợ:</span>
                  <span className="text-sm font-semibold">{formatCurrency(Number(laborCost) || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tiền phụ tùng:</span>
                  <span className="text-sm font-semibold">{formatCurrency(partsCostTotal)}</span>
                </div>

                {selectedCustomerId && customerLoyaltyPoints > 0 && (
                  <div className="pt-3 border-t border-dashed border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Điểm tích lũy hiện có:</span>
                      <span className="font-bold text-amber-600">{customerLoyaltyPoints} điểm ({formatCurrency(customerLoyaltyPoints * 1000)})</span>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase">Quy đổi điểm giảm giá</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pointsToRedeem}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            if (cleanVal === "") {
                              setPointsToRedeem("");
                            } else {
                              const numVal = Math.min(customerLoyaltyPoints, parseInt(cleanVal, 10));
                              setPointsToRedeem(numVal);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary font-bold text-primary"
                          placeholder={`Tối đa: ${customerLoyaltyPoints}`}
                        />
                        <span className="absolute right-2 text-[10px] font-bold text-muted-foreground">Điểm</span>
                      </div>
                    </div>
                    {Number(pointsToRedeem) > 0 && (
                      <div className="flex items-center justify-between text-xs text-success bg-success/5 border border-success/15 p-2 rounded-lg">
                        <span className="font-semibold">Chiết khấu đổi điểm:</span>
                        <span className="font-bold">-{formatCurrency(Number(pointsToRedeem) * 1000)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-dashed border-border/40">
                  <span className="text-xs text-muted-foreground font-bold">Tổng thanh toán:</span>
                  <span className="text-lg font-black text-primary tracking-tight">{formatCurrency(finalTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                  <span>+ VAT (10% dự kiến):</span>
                  <span>{formatCurrency(vatEstimate)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border/40 pt-4 mt-4 text-[11px] text-muted-foreground/80">
              <div className="flex justify-between">
                <span>Số dòng phụ tùng:</span>
                <span className="font-bold text-foreground">{items.length} dòng</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng đơn vị phụ tùng:</span>
                <span className="font-bold text-foreground">{totalPartsQuantity} đơn vị</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-border/40">
              <button
                type="button"
                onClick={() => router.push("/workshop")}
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
                    <Sparkles size={13} /> Lưu lệnh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {alertConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border/85 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{alertConfig.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alertConfig.message}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAlertConfig(null)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
