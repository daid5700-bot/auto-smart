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

export default function NewDocumentPage() {
  const router = useRouter();
  
  // Custom dropdown states
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const vehDropdownRef = useRef<HTMLDivElement>(null);
  const [isVehDropdownOpen, setIsVehDropdownOpen] = useState(false);
  const [vehSearchQuery, setVehSearchQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (vehDropdownRef.current && !vehDropdownRef.current.contains(event.target as Node)) {
        setIsVehDropdownOpen(false);
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

  // Wholesale suggestions
  const [showWholesaleSuggestions, setShowWholesaleSuggestions] = useState(false);
  const [wholesaleSuggestions, setWholesaleSuggestions] = useState<any[]>([]);

  // Warehouse vehicle selection
  const [warehouseVehicles, setWarehouseVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // Metadata: Plate cost & Accessories
  const [plateCost, setPlateCost] = useState("");
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>([]);
  const [giftItems, setGiftItems] = useState<Accessory[]>([]);
  const [rawNotes, setRawNotes] = useState("");

  // Accessory search & list
  const [products, setProducts] = useState<any[]>([]);
  const [accessorySearch, setAccessorySearch] = useState("");
  const [giftSearch, setGiftSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Sale mode
  const [saleMode, setSaleMode] = useState<"RETAIL"|"WHOLESALE">("RETAIL");
  const [wholesaleVehicles, setWholesaleVehicles] = useState<{id:number;vin:string;model:string;variant:string;color:string;listPrice:string}[]>([]);
  const [wholesaleSearch, setWholesaleSearch] = useState("");

  const fetchProducts = async (branchFilterId?: number) => {
    try {
      const url = branchFilterId 
        ? `/api/inventory?limit=100&branchFilter=${branchFilterId}`
        : "/api/inventory?limit=100";
      const data = await fetchWithDedup(url);
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchWithDedup("/api/crm?tab=customers&limit=200&allBranches=true");
      setSystemCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarehouseVehicles = async () => {
    try {
      const data = await fetchWithDedup("/api/sales?limit=1000");
      const filtered = (data.vehicles || []).filter(
        (v: any) => v.status === "AVAILABLE" || v.status === "INCOMING"
      );
      setWarehouseVehicles(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchWarehouseVehicles();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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

  const handleWholesalePhoneChange = (val: string) => {
    setCustomerPhone(val);
    setSelectedCustomerId("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (val.trim().length > 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const data = await fetchWithDedup(`/api/search/phone?q=${encodeURIComponent(val)}`);
          setWholesaleSuggestions(data.customers || []);
          setShowWholesaleSuggestions(true);
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    } else {
      setWholesaleSuggestions([]);
      setShowWholesaleSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Vui lòng nhập đầy đủ Tên khách hàng và Số điện thoại!");
      return;
    }
    if (saleMode === "RETAIL" && !selectedVehicleId) {
      alert("Vui lòng chọn một xe từ kho hệ thống!");
      return;
    }
    if (saleMode === "WHOLESALE" && wholesaleVehicles.length === 0) {
      alert("Vui lòng chọn ít nhất một xe để bán buôn!");
      return;
    }
    setIsSubmitting(true);
    try {
      if (saleMode === "WHOLESALE") {
        for (const wv of wholesaleVehicles) {
          const res = await fetch(`/api/sales/${wv.id}`, {
            method: "PATCH",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
              status, bankStatus:"NONE", plateStatus:"PENDING", plateCost:0,
              listPrice: Number(wv.listPrice)||0,
              accessoriesJson: "[]", notes: "Bán buôn",
              saleType: "WHOLESALE",
              customerName, customerPhone, customerBirthday: customerBirthday||undefined,
              customerAddress
            })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gặp lỗi khi xử lý xe: " + wv.vin);
          }
        }
        router.push("/sales/documents");
        router.refresh();
        return;
      }
      const payload = {
        vin, model, variant, color,
        year: Number(year)||new Date().getFullYear(),
        listPrice: Number(listPrice)||0,
        status, bankStatus, plateStatus,
        plateCost: Number(plateCost)||0,
        accessoriesJson: JSON.stringify(selectedAccessories.map(a=>({...a, quantity:Number(a.quantity)||1}))),
        giftItemsJson: JSON.stringify(giftItems.map(a=>({...a, quantity:Number(a.quantity)||1}))),
        notes: rawNotes, customerName, customerPhone,
        customerBirthday: customerBirthday||undefined,
        customerAddress,
        saleType: "RETAIL"
      };
      const res = await fetch(`/api/sales/${selectedVehicleId}`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push("/sales/documents");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Gặp lỗi khi lưu hồ sơ");
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

  const filteredVehicles = useMemo(() => {
    const term = vehSearchQuery.toLowerCase().trim();
    return warehouseVehicles.filter(v =>
      (v.model || "").toLowerCase().includes(term) ||
      (v.vin || "").toLowerCase().includes(term) ||
      (v.variant || "").toLowerCase().includes(term) ||
      (v.color || "").toLowerCase().includes(term)
    );
  }, [warehouseVehicles, vehSearchQuery]);

  const filteredWholesaleVehicles = useMemo(() => {
    const term = wholesaleSearch.toLowerCase().trim();
    return warehouseVehicles.filter(v =>
      v.model?.toLowerCase().includes(term) ||
      v.vin?.toLowerCase().includes(term)
    );
  }, [warehouseVehicles, wholesaleSearch]);

  const filteredGifts = useMemo(() => {
    const term = giftSearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term)
    );
  }, [products, giftSearch]);

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
            <Sparkles className="text-primary w-6 h-6" /> Tạo mới Hồ sơ & Thủ tục xe
          </h2>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5 pb-6">

        {/* ── Mode Toggle ── */}
        <div className="flex bg-secondary/30 p-1 rounded-xl w-fit mx-auto">
          <button type="button" onClick={()=>{setSaleMode("RETAIL");setWholesaleVehicles([]);}} className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${saleMode==="RETAIL"?"bg-card shadow text-primary":"text-muted-foreground hover:text-foreground"}`}>BÁN LẺ</button>
          <button type="button" onClick={()=>{setSaleMode("WHOLESALE");setSelectedVehicleId("");}} className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${saleMode==="WHOLESALE"?"bg-card shadow text-blue-600":"text-muted-foreground hover:text-foreground"}`}>BÁN BUÔN</button>
        </div>

        {/* ── WHOLESALE: Customer card ── */}
        {saleMode==="WHOLESALE" && (
          <div className="bg-card border border-border shadow-sm rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <User size={16} className="text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Thông tin Khách hàng</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">SĐT Khách *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => handleWholesalePhoneChange(e.target.value)}
                  onFocus={() => {
                    if (customerPhone.trim().length > 1) {
                      setShowWholesaleSuggestions(true);
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nhập SĐT để tìm..."
                />
                
                {showWholesaleSuggestions && wholesaleSuggestions.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowWholesaleSuggestions(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto animate-slide-in-bottom">
                      {wholesaleSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerPhone(c.phone);
                            setCustomerName(c.name);
                            setCustomerAddress(c.address || "");
                            setSelectedCustomerId(c.id.toString());
                            setShowWholesaleSuggestions(false);
                          }}
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên khách hàng *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Nguyễn Văn A..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ khách hàng</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Hà Nội, TP.HCM..."
                />
              </div>
            </div>
            
            {!selectedCustomerId && customerPhone && customerName && (
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl">
                <p className="text-xs font-semibold text-primary">Hệ thống sẽ tự động tạo khách hàng mới với tên và SĐT này.</p>
              </div>
            )}
          </div>
        )}

        {/* ── CARD 1: Thông tin Xe & Tiến độ (full width) ── */}
        <div className="bg-card border border-border shadow-sm rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2">
            <Car size={16} className="text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{saleMode==="RETAIL"?"Thông tin Xe & Tiến độ":"Chọn xe Bán Buôn"}</h4>
          </div>

          {/* ── RETAIL: single vehicle dropdown + status ── */}
          {saleMode==="RETAIL" && (
            <>
              <div className="space-y-1.5 relative" ref={vehDropdownRef}>
                <label className="text-xs font-bold text-muted-foreground">Chọn xe từ Kho hệ thống *</label>
                <button 
                  type="button" 
                  onClick={() => setIsVehDropdownOpen(!isVehDropdownOpen)}
                  className="w-full px-3 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all focus:ring-2 focus:ring-primary outline-none"
                >
                  <span className="truncate">
                    {selectedVehicleId 
                      ? `${model} ${variant ? `(${variant})` : ""} - ${color || "Không màu"} - VIN: ${vin}` 
                      : "-- Chọn xe từ kho hệ thống * --"}
                  </span>
                  <ChevronDown size={14} className={`text-muted-foreground shrink-0 ml-2 transition-transform ${isVehDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isVehDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-border bg-secondary/15">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                          autoFocus 
                          type="text" 
                          placeholder="Tìm xe theo model, variant, màu, hoặc VIN..." 
                          value={vehSearchQuery} 
                          onChange={(e) => setVehSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary font-semibold" 
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-border/20">
                      {filteredVehicles.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground text-center">Không tìm thấy xe phù hợp</div>
                      ) : (
                        filteredVehicles.map((v) => (
                          <button 
                            key={v.id} 
                            type="button" 
                            onClick={() => {
                              setSelectedVehicleId(v.id.toString());
                              setVin(v.vin || "");
                              setModel(v.model || "");
                              setVariant(v.variant || "");
                              setColor(v.color || "");
                              setYear((v.year || 2026).toString());
                              setListPrice(v.listPrice ? Number(v.listPrice).toString() : "");
                              setIsVehDropdownOpen(false);
                              if (v.branchId) {
                                fetchProducts(v.branchId);
                              }
                            }} 
                            className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg flex flex-col hover:bg-secondary/40 ${selectedVehicleId === v.id.toString() ? "bg-primary/10 text-primary" : "text-foreground"}`}
                          >
                            <span className="font-bold">{v.model} {v.variant ? `(${v.variant})` : ""}</span>
                            <span className="text-[10px] text-muted-foreground font-normal mt-0.5">Màu: {v.color || "N/A"} • VIN: {v.vin}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedVehicleId&&(<div className="bg-primary/5 border border-primary/20 rounded-xl p-4"><p className="text-xs text-muted-foreground font-semibold mb-1">Xe đã chọn:</p><h3 className="text-sm font-bold text-primary">{model} {variant?`(${variant})`:""} — {color||"N/A"}</h3><div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground"><span><strong>VIN:</strong> {vin}</span><span><strong>Niêm yết:</strong> {listPrice?Number(listPrice).toLocaleString("vi-VN"):"0"} VNĐ</span></div></div>)}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Tiến độ tổng quan *</label><select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"><option value="RESERVED">ĐÃ CỌC (Reserved)</option><option value="SOLD">ĐÃ BÁN (Sold)</option></select></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Tiến độ Ngân hàng</label><select value={bankStatus} onChange={(e)=>setBankStatus(e.target.value)} className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"><option value="NONE">Mua thẳng (Không vay)</option><option value="PENDING_APPROVAL">Chờ phê duyệt vay</option><option value="APPROVED">Đã ra thông báo vay</option><option value="DISBURSED">Đã giải ngân</option></select></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-muted-foreground">Thủ tục bấm biển</label><select value={plateStatus} onChange={(e)=>setPlateStatus(e.target.value)} className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none"><option value="PENDING">Chờ nộp thuế (Đợi biển)</option><option value="TAX_PAID">Đã nộp thuế trước bạ</option><option value="PLATE_DONE">Đã bấm biển &amp; Bàn giao xe</option></select></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-primary">Giá bán thực tế (VNĐ) *</label><NumericInput required placeholder="Nhập giá bán..." value={listPrice} onChange={setListPrice} className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-bold text-primary"/></div>
              </div>
            </>
          )}

          {/* ── WHOLESALE: multi vehicle picker ── */}
          {saleMode==="WHOLESALE" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột trái: Kho xe */}
                <div className="bg-secondary/10 border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kho xe hiện có</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13}/>
                    <input type="text" placeholder="Tìm theo model, VIN..." value={wholesaleSearch} onChange={(e)=>setWholesaleSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-background border border-border/50 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                    {filteredWholesaleVehicles.map(v=>{
                      if(wholesaleVehicles.some(wv=>wv.id===v.id))return null;
                      return(
                        <div key={v.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-background transition-colors text-xs border border-transparent hover:border-border/50">
                          <div><p className="font-bold text-foreground">{v.model} {v.variant?`(${v.variant})`:""}</p><p className="text-[10px] text-muted-foreground">VIN: {v.vin} • {v.color||"Không màu"}</p></div>
                          <button type="button" onClick={()=>setWholesaleVehicles([...wholesaleVehicles,{id:v.id,vin:v.vin,model:v.model,variant:v.variant||"",color:v.color||"",listPrice:v.listPrice?.toString()||""}])}
                            className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-[10px] font-bold rounded-lg shrink-0">Thêm</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cột phải: Đã chọn */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Xe xuất buôn ({wholesaleVehicles.length})</p>
                  </div>
                  <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 flex-1">
                    {wholesaleVehicles.map(wv=>(
                      <div key={wv.id} className="flex items-center justify-between gap-3 text-xs bg-background p-2.5 rounded-lg border border-primary/20 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate" title={`${wv.model} ${wv.variant?`(${wv.variant})`:""}`}>{wv.model} {wv.variant?`(${wv.variant})`:""}</p>
                          <p className="text-[10px] text-muted-foreground truncate">VIN: {wv.vin} • {wv.color}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative">
                            <NumericInput placeholder="Giá bán..."
                              value={wv.listPrice}
                              onChange={(c)=>setWholesaleVehicles(wholesaleVehicles.map(x=>x.id===wv.id?{...x,listPrice:c}:x))}
                              className="w-36 px-2 py-1.5 border border-border rounded-lg bg-background text-xs font-bold focus:border-primary outline-none text-emerald-600 text-right pr-6" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">đ</span>
                          </div>
                          <button type="button" onClick={()=>setWholesaleVehicles(wholesaleVehicles.filter(x=>x.id!==wv.id))} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                    {wholesaleVehicles.length===0&&<div className="h-full flex items-center justify-center py-8"><p className="text-xs text-primary/60 italic text-center">Chưa chọn xe nào.</p></div>}
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div className="flex items-center gap-4 bg-secondary/10 border border-border/50 rounded-xl p-4">
                <label className="text-xs font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Tiến độ tổng quan *</label>
                <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full max-w-sm px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary outline-none">
                  <option value="RESERVED">ĐÃ CỌC (Reserved)</option>
                  <option value="SOLD">ĐÃ BÁN (Sold)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── ROW 2: RETAIL only ── */}
        {saleMode==="RETAIL" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* ── CARD 2: Thông tin Khách hàng ── */}
          <div className="bg-card border border-border shadow-sm rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <User size={16} className="text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Thông tin Khách hàng</h4>
            </div>

            {/* Customer dropdown trigger */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-muted-foreground">Chọn từ hệ thống</label>
                <button type="button" onClick={()=>setIsOpen(!isOpen)}
                  className="w-full px-3 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all focus:ring-2 focus:ring-primary outline-none">
                  <span className="truncate">{selectedCustomerId?`${customerName} (${customerPhone})`:"-- Chọn khách hàng --"}</span>
                  <ChevronDown size={14} className={`text-muted-foreground shrink-0 ml-2 transition-transform ${isOpen?"rotate-180":""}`} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-border bg-secondary/15">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input autoFocus type="text" placeholder="Tìm tên hoặc SĐT..." value={customerSearchQuery} onChange={(e)=>setCustomerSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary font-semibold" />
                      </div>
                    </div>
                    {isSearchingCustomers && (
                      <div className="p-2 text-center text-[10px] text-muted-foreground bg-secondary/5 flex items-center justify-center gap-1.5 border-b border-border/40">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        Đang tìm kiếm...
                      </div>
                    )}
                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-border/20">
                      {filteredCustomers.length===0
                        ? <div className="px-3 py-3 text-xs text-muted-foreground text-center">Không tìm thấy</div>
                        : filteredCustomers.map((cust)=>(
                          <button key={cust.id} type="button" onClick={()=>{
                            setSelectedCustomerId(cust.id.toString());
                            setCustomerName(cust.name||"");setCustomerPhone(cust.phone||"");
                            setCustomerBirthday(cust.birthday?new Date(cust.birthday).toISOString().split("T")[0]:"");
                            setCustomerAddress(cust.address||"");
                            setIsNewCustomer(false);setIsOpen(false);
                          }} className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg flex items-center justify-between hover:bg-secondary/40 ${selectedCustomerId===cust.id.toString()?"bg-primary/10 text-primary":"text-foreground"}`}>
                            <span>{cust.name}</span><span className="text-[10px] text-muted-foreground ml-2 shrink-0">{cust.phone}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-end">
                {!selectedCustomerId&&!isNewCustomer&&(
                  <button type="button" onClick={()=>{setIsNewCustomer(true);setCustomerName("");setCustomerPhone("");setCustomerBirthday("");setCustomerAddress("");}}
                    className="w-full px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                    <Plus size={14} /> Thêm khách mới
                  </button>
                )}
              </div>
            </div>

            {/* Customer detail fields */}
            {(selectedCustomerId||isNewCustomer)&&(
              <div className="bg-secondary/10 border border-border/60 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {selectedCustomerId?"Liên kết khách hệ thống":"Khách hàng mới tự nhập"}
                  </span>
                  {isNewCustomer&&(<button type="button" onClick={()=>{setIsNewCustomer(false);setCustomerName("");setCustomerPhone("");setCustomerBirthday("");setCustomerAddress("");}} className="text-xs font-bold text-muted-foreground hover:text-foreground">Hủy</button>)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Tên khách *</label>
                    <input type="text" required placeholder="Nguyễn Văn A..." value={customerName} onChange={(e)=>setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Số điện thoại *</label>
                    <input type="text" required placeholder="0987654321" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Ngày sinh</label>
                    <input type="date" value={customerBirthday} onChange={(e)=>setCustomerBirthday(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Địa chỉ</label>
                    <input type="text" placeholder="Hà Nội, TP.HCM..." value={customerAddress} onChange={(e)=>setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── CARD 3: Dịch vụ & Phụ tùng ── */}
          <div className="bg-card border border-border shadow-sm rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <Receipt size={16} className="text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Dịch vụ đi kèm &amp; Ghi chú</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Chi phí làm biển (VNĐ)</label>
                <NumericInput placeholder="Tự điền chi phí biển..."
                  value={plateCost}
                  onChange={setPlateCost}
                  className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-bold text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Ghi chú thủ tục</label>
                <input type="text" placeholder="VD: Đợi chuyển khoản tiền thuế..." value={rawNotes} onChange={(e)=>setRawNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs font-bold text-muted-foreground block">Chọn Phụ tùng mua kèm (Tính tiền chung)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-xl p-3 space-y-2 bg-secondary/5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                    <input type="text" placeholder="Tìm phụ tùng..." value={accessorySearch} onChange={(e)=>setAccessorySearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-background border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1 divide-y divide-border/60">
                    {filteredAccessories.map((p)=>{
                      const price=p.prices?.find((pr:any)=>pr.type==="RETAIL")?.amount||0;
                      return (
                        <div key={p.id} className="flex items-center justify-between pt-1.5 text-xs">
                          <div className="flex-1 min-w-0 pr-1"><p className="font-bold text-foreground truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{formatCurrency(price)}</p></div>
                          <button type="button" onClick={()=>handleAddAccessory(p)} className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg shrink-0">Chọn</button>
                        </div>
                      );
                    })}
                    {filteredAccessories.length===0&&<p className="text-xs text-muted-foreground italic text-center py-3">Không tìm thấy.</p>}
                  </div>
                </div>
                <div className="border border-border rounded-xl p-3 space-y-2 bg-secondary/5">
                  <p className="text-xs font-bold text-primary">Danh sách mua kèm:</p>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                    {selectedAccessories.map((a)=>(
                      <div key={a.id} className="flex items-center gap-2 text-xs bg-background p-2 rounded-lg border border-border">
                        <div className="flex-1 min-w-0"><p className="font-bold text-foreground truncate">{a.name}</p><p className="text-[10px] text-muted-foreground">{formatCurrency(a.price)}</p></div>
                        <NumericInput
                          value={a.quantity}
                          onChange={(c)=>handleUpdateAccessoryQty(a.id,c===""?"":parseInt(c,10))}
                          className="w-10 text-center py-0.5 border border-border rounded bg-secondary/30 text-xs font-bold shrink-0" />
                        <button type="button" onClick={()=>handleRemoveAccessory(a.id)} className="p-1 hover:bg-rose-500/10 text-rose-500 rounded shrink-0"><Trash2 size={13}/></button>
                      </div>
                    ))}
                    {selectedAccessories.length===0&&<p className="text-xs text-muted-foreground italic text-center py-3">Chưa chọn phụ tùng mua kèm.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-border">
              <label className="text-xs font-bold text-emerald-600 block flex items-center gap-2">
                <Sparkles size={14} /> Chọn Quà tặng (Không tính tiền, chờ kho duyệt)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-emerald-500/20 rounded-xl p-3 space-y-2 bg-emerald-500/5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                    <input type="text" placeholder="Tìm phụ tùng tặng..." value={giftSearch} onChange={(e)=>setGiftSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-background border border-emerald-500/30 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1 divide-y divide-emerald-500/20">
                    {filteredGifts.map((p)=>{
                      return (
                        <div key={p.id} className="flex items-center justify-between pt-1.5 text-xs">
                          <div className="flex-1 min-w-0 pr-1"><p className="font-bold text-foreground truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">Tồn: {p.stockCount||0}</p></div>
                          <button type="button" onClick={()=>handleAddGiftItem(p)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shrink-0">Tặng</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border border-emerald-500/20 rounded-xl p-3 space-y-2 bg-emerald-500/5">
                  <p className="text-xs font-bold text-emerald-600">Danh sách quà tặng:</p>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                    {giftItems.map((a)=>(
                      <div key={a.id} className="flex items-center gap-2 text-xs bg-background p-2 rounded-lg border border-emerald-500/20">
                        <div className="flex-1 min-w-0"><p className="font-bold text-foreground truncate">{a.name}</p><p className="text-[10px] text-muted-foreground">Q.tặng</p></div>
                        <NumericInput
                          value={a.quantity}
                          onChange={(c)=>handleUpdateGiftItemQty(a.id,c===""?"":parseInt(c,10))}
                          className="w-10 text-center py-0.5 border border-emerald-500/40 rounded bg-secondary/30 text-xs font-bold shrink-0 text-emerald-600" />
                        <button type="button" onClick={()=>handleRemoveGiftItem(a.id)} className="p-1 hover:bg-rose-500/10 text-rose-500 rounded shrink-0"><Trash2 size={13}/></button>
                      </div>
                    ))}
                    {giftItems.length===0&&<p className="text-xs text-emerald-600/70 italic text-center py-3">Chưa chọn quà tặng nào.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}


        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={()=>router.push("/sales/documents")}
            className="px-5 py-2.5 border border-border text-foreground hover:bg-secondary/60 rounded-xl text-xs font-bold transition-all">
            Hủy bỏ
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:shadow-primary/30 hover:scale-[1.02] transition-all inline-flex items-center gap-2">
            {isSubmitting?(<><Loader2 className="w-3.5 h-3.5 animate-spin"/> Đang lưu...</>):"Lưu hồ sơ"}
          </button>
        </div>

      </form>
    </div>
  );
}
