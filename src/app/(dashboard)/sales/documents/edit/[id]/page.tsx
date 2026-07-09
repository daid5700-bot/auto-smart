"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, Plus, X, Search, User, Info, 
  Sparkles, Receipt, Car, Trash2, ChevronDown
} from "lucide-react";
import { fetchWithDedup, formatCurrency, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";

interface Accessory {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number | "";
}

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const vehicleId = params.id;

  // Custom dropdown states
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Form State
  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [listPrice, setListPrice] = useState("");
  const [status, setStatus] = useState("RESERVED"); // RESERVED, SOLD
  const [bankStatus, setBankStatus] = useState("NONE");
  const [plateStatus, setPlateStatus] = useState("PENDING");
  
  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerBirthday, setCustomerBirthday] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [systemCustomers, setSystemCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // Metadata: Plate cost & Accessories
  const [plateCost, setPlateCost] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>([]);
  const [giftItems, setGiftItems] = useState<Accessory[]>([]);
  const [isGiftLocked, setIsGiftLocked] = useState(false);
  const [isAccLocked, setIsAccLocked] = useState(false);
  const [rawNotes, setRawNotes] = useState("");

  // Accessory search & list
  const [products, setProducts] = useState<any[]>([]);
  const [accessorySearch, setAccessorySearch] = useState("");
  const [giftSearch, setGiftSearch] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseAccessories = (val: any): Accessory[] => {
    try {
      if (!val) return [];
      if (typeof val === "string") return JSON.parse(val);
      if (Array.isArray(val)) return val;
      return [];
    } catch (e) {
      return [];
    }
  };

  const fetchVehicleAndData = async () => {
    try {
      setLoading(true);
      // Fetch the specific vehicle first to get its branchId
      const vehicle = await fetchWithDedup(`/api/sales/${vehicleId}`);

      if (vehicle) {
        // Fetch products filtering by vehicle's branch, and customers
        const [productsData, customersData] = await Promise.all([
          fetchWithDedup(`/api/inventory?limit=100&branchFilter=${vehicle.branchId || ""}`),
          fetchWithDedup("/api/crm?tab=customers&limit=200&allBranches=true")
        ]);

        setProducts(productsData.products || []);

        const loadedCustomers = customersData.customers || [];
        setSystemCustomers(loadedCustomers);

        setVin(vehicle.vin || "");
        setModel(vehicle.model || "");
        setVariant(vehicle.variant || "");
        setColor(vehicle.color || "");
        setYear((vehicle.year || new Date().getFullYear()).toString());
        setListPrice(vehicle.listPrice ? Number(vehicle.listPrice).toString() : "");
        setStatus(vehicle.status || "RESERVED");
        setBankStatus(vehicle.bankStatus || "NONE");
        setPlateStatus(vehicle.plateStatus || "PENDING");
        
        setCustomerName(vehicle.customer?.name || "");
        setCustomerPhone(vehicle.customer?.phone || "");
        setCustomerBirthday(
          vehicle.customer?.birthday 
            ? new Date(vehicle.customer.birthday).toISOString().split("T")[0] 
            : ""
        );
        setCustomerAddress(vehicle.customer?.address || "");

        if (vehicle.customerId) {
          setSelectedCustomerId(vehicle.customerId.toString());
          setIsNewCustomer(false);
        } else {
          setSelectedCustomerId("");
          setIsNewCustomer(false);
        }

        const plateCostVal = Number(vehicle.plateCost || 0);
        setPlateCost(plateCostVal > 0 ? plateCostVal.toString() : "");
        setSelectedAccessories(parseAccessories(vehicle.accessoriesJson));
        
        // Check lock status for accessories
        if (vehicle.accessoriesExportStatus === "PAID") {
          setIsAccLocked(true);
        }

        // Extract gift items from partsRequisitions if available
        if (vehicle.partsRequisitions && vehicle.partsRequisitions.length > 0) {
          const req = vehicle.partsRequisitions[0];
          
          // Lock if requisition is APPROVED or REJECTED
          if (req.status === "APPROVED" || req.status === "REJECTED") {
            setIsGiftLocked(true);
          }

          const mappedGifts = req.items.map((item: any) => ({
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            price: Number(item.product.movingAvgCost || 0),
            quantity: item.quantity
          }));
          setGiftItems(mappedGifts);
        }

        setRawNotes(vehicle.notes || "");
      } else {
        alert("Không tìm thấy hồ sơ xe này");
        router.push("/sales/documents");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi nạp dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleAndData();
  }, [vehicleId]);

  useEffect(() => {
    if (customerSearchQuery.trim().length > 1) {
      setIsSearchingCustomers(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(customerSearchQuery)}`);
          const data = await res.json();
          setSearchResults(data.customers || []);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearchingCustomers(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [customerSearchQuery]);

  const handleAddAccessory = (p: any) => {
    const exists = selectedAccessories.find(a => a.id === p.id);
    if (exists) {
      setSelectedAccessories(
        selectedAccessories.map(a => a.id === p.id ? { ...a, quantity: (Number(a.quantity) || 0) + 1 } : a)
      );
    } else {
      const retailPrice = p.prices?.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
      setSelectedAccessories([
        ...selectedAccessories,
        { id: p.id, name: p.name, sku: p.sku, price: Number(retailPrice), quantity: 1 }
      ]);
    }
  };

  const handleRemoveAccessory = (id: number) => {
    setSelectedAccessories(selectedAccessories.filter(a => a.id !== id));
  };

  const handleUpdateAccessoryQty = (id: number, qty: number | "") => {
    setSelectedAccessories(
      selectedAccessories.map(a => a.id === id ? { ...a, quantity: qty === "" ? "" : Math.max(1, qty) } : a)
    );
  };

  const handleAddGiftItem = (p: any) => {
    const exists = giftItems.find(a => a.id === p.id);
    if (exists) {
      setGiftItems(
        giftItems.map(a => a.id === p.id ? { ...a, quantity: (Number(a.quantity) || 0) + 1 } : a)
      );
    } else {
      const costPrice = p.movingAvgCost || 0;
      setGiftItems([
        ...giftItems,
        { id: p.id, name: p.name, sku: p.sku, price: Number(costPrice), quantity: 1 }
      ]);
    }
  };

  const handleRemoveGiftItem = (id: number) => {
    setGiftItems(giftItems.filter(a => a.id !== id));
  };

  const handleUpdateGiftItemQty = (id: number, qty: number | "") => {
    setGiftItems(
      giftItems.map(a => a.id === id ? { ...a, quantity: qty === "" ? "" : Math.max(1, qty) } : a)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vin || !model || !customerName || !customerPhone) {
      alert("Vui lòng nhập đầy đủ Số khung, Dòng xe, Tên khách hàng và Số điện thoại!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vin,
        model,
        variant,
        color,
        year: Number(year) || new Date().getFullYear(),
        listPrice: Number(listPrice) || 0,
        status,
        bankStatus,
        plateStatus,
        plateCost: Number(plateCost) || 0,
        accessoriesJson: JSON.stringify(selectedAccessories.map(a => ({ ...a, quantity: Number(a.quantity) || 1 }))),
        giftItemsJson: JSON.stringify(giftItems.map(a => ({ ...a, quantity: Number(a.quantity) || 1 }))),
        notes: rawNotes,
        customerName,
        customerPhone,
        customerBirthday: customerBirthday || undefined,
        customerAddress
      };

      const res = await fetch(`/api/sales/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        router.push("/sales/documents");
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gặp lỗi khi cập nhật hồ sơ");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccessories = useMemo(() => {
    const term = accessorySearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term)
    );
  }, [products, accessorySearch]);

  const filteredCustomers = useMemo(() => {
    if (customerSearchQuery.trim().length > 1) {
      return searchResults;
    }
    const term = customerSearchQuery.toLowerCase().trim();
    if (term) {
      return systemCustomers.filter(cust => 
        (cust.name || "").toLowerCase().includes(term) ||
        (cust.phone || "").includes(term)
      );
    }
    return systemCustomers.slice(0, 15);
  }, [systemCustomers, customerSearchQuery, searchResults]);

  const filteredGifts = useMemo(() => {
    const term = giftSearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term)
    );
  }, [products, giftSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-bold">Đang tải dữ liệu hồ sơ xe...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 stagger pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-border">
        <button
          onClick={() => router.push("/sales/documents")}
          className="p-2 bg-secondary/40 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Quản trị bán hàng / Hồ sơ & Thủ tục
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
            <Sparkles className="text-primary w-6 h-6" /> Cập nhật Hồ sơ & Thủ tục xe
          </h2>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-lg p-6 space-y-8">
        
        {/* SECTION 1: VEHICLE & PROGRESS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-1.5">
            <Car size={16} className="text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Thông tin Xe & Tiến độ</h4>
          </div>
          {/* Selected Vehicle Preview Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Dòng xe đang thực hiện hồ sơ:</p>
              <h3 className="text-base font-bold text-primary mt-0.5">
                {model} {variant ? `(${variant})` : ""} - {color || "N/A"}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                <span><strong>Số khung (VIN):</strong> {vin}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Tiến độ tổng quan *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="RESERVED">ĐÃ CỌC (Reserved)</option>
                <option value="SOLD">ĐÃ BÁN (Sold)</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Tiến độ Ngân hàng (Trả góp)</label>
              <select
                value={bankStatus}
                onChange={(e) => setBankStatus(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="NONE">Mua thẳng (Không vay ngân hàng)</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt hồ sơ vay</option>
                <option value="APPROVED">Đã ra thông báo cho vay</option>
                <option value="DISBURSED">Đã giải ngân tiền</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Thủ tục bấm biển</label>
              <select
                value={plateStatus}
                onChange={(e) => setPlateStatus(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="PENDING">Chờ nộp thuế (Đợi biển)</option>
                <option value="TAX_PAID">Đã nộp thuế trước bạ</option>
                <option value="PLATE_DONE">Đã bấm biển & Bàn giao xe</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary">Giá bán thực tế (VNĐ) *</label>
              <NumericInput
                required
                placeholder="Nhập giá bán..."
                value={listPrice}
                onChange={setListPrice}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold text-primary"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER INFO */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-1.5">
            <User size={16} className="text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Thông tin Khách hàng</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-muted-foreground">Chọn Khách hàng từ Hệ thống</label>
              
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold text-left flex items-center justify-between transition-all"
              >
                <span className="truncate">
                  {selectedCustomerId
                    ? `${customerName} (${customerPhone})`
                    : "-- Chọn khách hàng đã có --"}
                </span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {isOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col stagger w-full">
                  {/* Sticky Search Input inside Dropdown */}
                  <div className="p-2 border-b border-border bg-secondary/15">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nhập tên hoặc số điện thoại để tìm..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                      />
                    </div>
                  </div>
                  {isSearchingCustomers && (
                    <div className="p-2 text-center text-[10px] text-muted-foreground bg-secondary/5 flex items-center justify-center gap-1.5 border-b border-border/40">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      Đang tìm kiếm...
                    </div>
                  )}

                  {/* Options List */}
                  <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground text-center font-semibold">
                        Không tìm thấy khách hàng nào
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            const val = cust.id.toString();
                            setSelectedCustomerId(val);
                            setCustomerName(cust.name || "");
                            setCustomerPhone(cust.phone || "");
                            setCustomerBirthday(
                              cust.birthday 
                                ? new Date(cust.birthday).toISOString().split("T")[0] 
                                : ""
                            );
                            setCustomerAddress(cust.address || "");
                            setIsNewCustomer(false);
                            setIsOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg transition-colors flex items-center justify-between hover:bg-secondary/40 ${
                            selectedCustomerId === cust.id.toString()
                              ? "bg-primary/10 text-primary"
                              : "text-foreground"
                          }`}
                        >
                          <span>{cust.name}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold ml-2 shrink-0">{cust.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-end">
              {!selectedCustomerId && !isNewCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCustomer(true);
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerBirthday("");
                    setCustomerAddress("");
                  }}
                  className="w-full md:w-auto px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Plus size={14} /> Thêm khách hàng mới
                </button>
              )}
            </div>
          </div>

          {/* Conditional fields for customer details */}
          {(selectedCustomerId || isNewCustomer) && (
            <div className="bg-secondary/10 border border-border/60 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {selectedCustomerId ? "Liên kết khách hệ thống" : "Khách hàng mới tự nhập"}
                </span>
                {isNewCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(false);
                      setCustomerName("");
                      setCustomerPhone("");
                      setCustomerBirthday("");
                      setCustomerAddress("");
                    }}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Hủy
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="0987654321..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Ngày / Tháng / Năm sinh</label>
                  <input
                    type="date"
                    value={customerBirthday}
                    onChange={(e) => setCustomerBirthday(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Địa chỉ</label>
                  <input
                    type="text"
                    placeholder="Hà Nội, TP.HCM..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: SERVICES & METADATA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-1.5">
            <Receipt size={16} className="text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dịch vụ đi kèm & Ghi chú</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Plate Cost */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Chi phí làm biển tự điền (VNĐ)</label>
              <NumericInput
                placeholder="Tự điền chi phí biển..."
                value={plateCost}
                onChange={setPlateCost}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">Ghi chú thủ tục</label>
              <input
                type="text"
                placeholder="Ví dụ: Đợi chuyển khoản nốt tiền thuế, khách tự đi đăng ký..."
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Accessories Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground block">Chọn Phụ tùng mua kèm</label>
              {isAccLocked && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                  Đã duyệt xuất kho
                </span>
              )}
            </div>
            
            {isAccLocked ? (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  * Bộ phận kho đã phê duyệt hoặc xuất kho cho đơn phụ kiện này. Danh sách phụ kiện mua kèm hiện đã bị khóa và không thể chỉnh sửa.
                </p>
                <div className="bg-background rounded-xl p-3 border border-border max-h-[160px] overflow-y-auto space-y-2">
                  {selectedAccessories.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/10">
                      <span className="font-bold text-foreground truncate">{a.name}</span>
                      <span className="text-muted-foreground text-xs font-bold shrink-0">x{a.quantity} ({formatCurrency(a.price)})</span>
                    </div>
                  ))}
                  {selectedAccessories.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Không có phụ tùng mua kèm nào.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Selection List */}
                <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm phụ tùng..."
                      value={accessorySearch}
                      onChange={(e) => setAccessorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 divide-y divide-border/60">
                    {filteredAccessories.map((p) => {
                      const price = p.prices?.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
                      return (
                        <div key={p.id} className="flex items-center justify-between pt-1.5 text-xs">
                          <div>
                            <p className="font-bold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.sku} • {formatCurrency(price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddAccessory(p)}
                            className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
                          >
                            Chọn
                          </button>
                        </div>
                      );
                    })}
                    {filteredAccessories.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Không tìm thấy phụ tùng phù hợp.</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Selected list */}
                <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/5">
                  <p className="text-xs font-bold text-primary">Danh sách đã chọn:</p>
                  <div className="max-h-[160px] overflow-y-auto space-y-2">
                    {selectedAccessories.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs bg-background p-2 rounded-lg border border-border">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-foreground truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(a.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={a.quantity}
                            onChange={(c) => handleUpdateAccessoryQty(a.id, c === "" ? "" : parseInt(c, 10))}
                            className="w-12 text-center py-0.5 border border-border rounded bg-secondary/30 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAccessory(a.id)}
                            className="p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedAccessories.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Chưa chọn phụ tùng mua kèm.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-600 block flex items-center gap-2">
                <Sparkles size={14} /> Chọn Quà tặng (Không tính tiền, chờ kho duyệt)
              </label>
              {isGiftLocked && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                  Đã duyệt/từ chối quà tặng
                </span>
              )}
            </div>
            
            {isGiftLocked ? (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  * Bộ phận kho đã phê duyệt hoặc từ chối phiếu quà tặng này. Danh sách quà tặng hiện đã bị khóa và không thể chỉnh sửa từ hồ sơ xe.
                </p>
                <div className="bg-background rounded-xl p-3 border border-emerald-500/10 max-h-[160px] overflow-y-auto space-y-2">
                  {giftItems.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="font-bold text-foreground truncate">{a.name}</span>
                      <span className="text-emerald-600 text-xs font-bold shrink-0">x{a.quantity} (Quà tặng)</span>
                    </div>
                  ))}
                  {giftItems.length === 0 && (
                    <p className="text-xs text-emerald-600/70 italic text-center py-2">Không có quà tặng nào.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-emerald-500/20 rounded-xl p-4 space-y-3 bg-emerald-500/5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm phụ tùng tặng..."
                      value={giftSearch}
                      onChange={(e) => setGiftSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-background border border-emerald-500/30 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 divide-y divide-emerald-500/20">
                    {filteredGifts.map((p) => {
                      return (
                        <div key={p.id} className="flex items-center justify-between pt-1.5 text-xs">
                          <div>
                            <p className="font-bold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">Tồn: {p.stockCount||0}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddGiftItem(p)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
                          >
                            Tặng
                          </button>
                        </div>
                      );
                    })}
                    {filteredGifts.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Không tìm thấy phụ tùng phù hợp.</p>
                    )}
                  </div>
                </div>

                <div className="border border-emerald-500/20 rounded-xl p-4 space-y-3 bg-emerald-500/5">
                  <p className="text-xs font-bold text-emerald-600">Danh sách quà tặng:</p>
                  <div className="max-h-[160px] overflow-y-auto space-y-2">
                    {giftItems.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs bg-background p-2 rounded-lg border border-emerald-500/20">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-foreground truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">Quà tặng</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={a.quantity}
                            onChange={(c) => handleUpdateGiftItemQty(a.id, c === "" ? "" : parseInt(c, 10))}
                            className="w-12 text-center py-0.5 border border-emerald-500/40 rounded bg-secondary/30 text-xs font-bold text-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGiftItem(a.id)}
                            className="p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {giftItems.length === 0 && (
                      <p className="text-xs text-emerald-600/70 italic text-center py-4">Chưa chọn quà tặng nào.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.push("/sales/documents")}
            className="px-4 py-2 border border-border text-foreground hover:bg-secondary/60 rounded-xl text-xs font-bold transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:shadow-primary/20 hover:scale-[1.02] transition-all inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
              </>
            ) : (
              "Lưu hồ sơ"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
