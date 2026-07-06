"use client";
import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatNumber, statusText, statusBadge, checkSlowMoving, exportToCsv } from "@/lib/utils";
import { Package, Search, Plus, AlertTriangle, TrendingUp, TrendingDown, ChevronRight, Edit, Trash2, Eye, Loader2, X, Download } from "lucide-react";
import { useAuth } from "@/lib/store";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Component xử lý nhập số để không bị nhảy con trỏ khi gõ tiếng Việt (IME)
const NumericInput = ({ value, onChange, className, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  // Khi đang focus (nhập liệu), hiển thị số thô không có dấu phẩy để tránh lỗi composition của Unikey/Vietkey
  // Khi blur (nhấn ra ngoài), hiển thị số đã được format có dấu phẩy
  const displayValue = isFocused
    ? (value === "" ? "" : value.toString())
    : (value === "" ? "" : Number(value).toLocaleString("vi-VN"));

  const handleChange = (e: any) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw === "" ? "" : parseInt(raw, 10));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false);
        if (props.onBlur) props.onBlur(e);
      }}
      className={className}
      {...props}
    />
  );
};

function InventoryContent() {
  const { user } = useAuth();
  const userRole = user?.role;
  const searchParams = useSearchParams();
  const initFilter = searchParams.get("filter");
  const lastInventoryFetchKey = useRef("");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [scope, setScope] = useState<"current" | "other">("current");
  const [statFilter, setStatFilter] = useState<"all" | "low" | "high">(
    (initFilter === "low" || initFilter === "high") ? initFilter : "all"
  );
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    if (initFilter === "low" || initFilter === "high") {
      setStatFilter(initFilter);
    }
  }, [initFilter]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    category: string;
    unit: string;
    stockCount: number | "";
    stockMin: number | "";
    stockMax: number | "";
    retailPrice: number | "";
    wholesalePrice: number | "";
    insurancePrice: number | "";
    parentId: string;
    branchId: string;
  }>({
    sku: "",
    name: "",
    category: "",
    unit: "",
    stockCount: "",
    stockMin: "",
    stockMax: "",
    retailPrice: "",
    wholesalePrice: "",
    insurancePrice: "",
    parentId: "",
    branchId: "",
  });

  const fetchData = (force = false) => {
    if (!userRole) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (catFilter) params.set("category", catFilter);
    if (statFilter !== "all") params.set("statFilter", statFilter);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (userRole !== "ADMIN") {
      params.set("scope", scope);
    }
    const fetchKey = params.toString();
    if (!force && lastInventoryFetchKey.current === fetchKey) return;
    lastInventoryFetchKey.current = fetchKey;

    fetch(`/api/inventory?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [search, catFilter, scope, statFilter, userRole, page]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phụ tùng này?")) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      sku: "",
      name: "",
      category: "Lọc",
      unit: "Cái",
      stockCount: "",
      stockMin: 5,
      stockMax: 100,
      retailPrice: "",
      wholesalePrice: "",
      insurancePrice: "",
      parentId: "",
      branchId: "",
    });
    setFormMessage(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    const retail = p.prices?.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
    const wholesale = p.prices?.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
    const insurance = p.prices?.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      stockCount: p.stockCount,
      stockMin: p.stockMin,
      stockMax: p.stockMax,
      retailPrice: Number(retail),
      wholesalePrice: Number(wholesale),
      insurancePrice: Number(insurance),
      parentId: p.parentId?.toString() || "",
      branchId: p.branchId?.toString() || "",
    });
    setFormMessage(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormMessage(null);
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";

      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        stockCount: Number(formData.stockCount),
        stockMin: Number(formData.stockMin),
        stockMax: Number(formData.stockMax),
        parentId: formData.parentId ? parseInt(formData.parentId) : null,
        prices: [
          { type: "RETAIL", amount: Number(formData.retailPrice) },
          { type: "WHOLESALE", amount: Number(formData.wholesalePrice) },
          { type: "INSURANCE", amount: Number(formData.insurancePrice) },
        ],
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormMessage({ type: "success", text: editingId ? "Cập nhật phụ tùng thành công." : "Thêm phụ tùng thành công." });
        setModalOpen(false);
        fetchData(true);
      } else {
        const result = await res.json().catch(() => null);
        setFormMessage({ type: "error", text: result?.error || "Không thể lưu phụ tùng." });
      }
    } catch (err: any) {
      console.error(err);
      setFormMessage({ type: "error", text: err.message || "Không thể lưu phụ tùng." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      "Mã SKU",
      "Tên phụ tùng",
      "Nhóm",
      "Đơn vị tính",
      "Tồn kho",
      "Tồn tối thiểu",
      "Tồn tối đa",
      "Giá Lẻ (VND)",
      "Giá Sỉ (VND)",
      "Giá Bảo hiểm (VND)",
      "Trạng thái",
    ];

    const rows = products.map((p: any) => {
      const retail = p.prices?.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
      const wholesale = p.prices?.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
      const insurance = p.prices?.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;
      return [
        p.sku,
        p.name,
        p.category,
        p.unit,
        p.stockCount.toString(),
        p.stockMin.toString(),
        p.stockMax.toString(),
        retail.toString(),
        wholesale.toString(),
        insurance.toString(),
        statusText(p.status),
      ];
    });

    exportToCsv("Danh_muc_phu_tung.csv", headers, rows);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const rawProducts = data?.products || [];
  const categories = data?.categories || [];
  const lowStock = rawProducts.filter((p: any) => p.stockCount <= p.stockMin);
  const highStock = rawProducts.filter((p: any) => p.stockCount >= p.stockMax);
  const pageTotalValue = rawProducts.reduce((sum: number, p: any) => {
    const retail = (p.prices || []).find((pr: any) => pr.type === "RETAIL");
    return sum + (retail ? Number(retail.amount) * p.stockCount : 0);
  }, 0);
  const pageTotalInsuranceValue = rawProducts.reduce((sum: number, p: any) => {
    const insurance = (p.prices || []).find((pr: any) => pr.type === "INSURANCE");
    return sum + (insurance ? Number(insurance.amount) * p.stockCount : 0);
  }, 0);

  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;
  const totalValue = data?.summary?.totalValue ?? pageTotalValue;
  const totalInsuranceValue = data?.summary?.totalInsuranceValue ?? pageTotalInsuranceValue;
  const lowStockCount = data?.summary?.lowStockCount ?? lowStock.length;
  const highStockCount = data?.summary?.highStockCount ?? highStock.length;

  const products = rawProducts;

  return (
    <>
      <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Danh mục phụ tùng</h2>

        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="bg-card border border-border hover:bg-secondary text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all w-fit"><Download size={16} />Xuất Excel</button>
          {(scope === "current" || user?.role === "ADMIN") && (
            <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><Plus size={16} />Thêm phụ tùng</button>
          )}
        </div>
      </div>

      {/* Scope Selector Tabs */}
      {user?.role !== "ADMIN" && (
        <div className="flex border-b border-border">
          <button
            onClick={() => { setScope("current"); setLoading(true); }}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
              scope === "current"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Cơ sở hiện tại
          </button>
          <button
            onClick={() => { setScope("other"); setLoading(true); }}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
              scope === "other"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Cơ sở khác
          </button>
        </div>
      )}

      {/* {user?.role !== "ADMIN" && scope === "other" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Chế độ xem cơ sở khác (Chỉ đọc)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bạn đang xem phụ tùng thuộc các chi nhánh khác trong hệ thống. Mọi thao tác thêm mới, sửa đổi, xóa bỏ đều bị vô hiệu hóa.
            </p>
          </div>
        </div>
      )} */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng mặt hàng */}
        <div
          onClick={() => setStatFilter("all")}
          className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
            statFilter === "all"
              ? "glass-card border-2 border-primary bg-primary/5 shadow-md shadow-primary/5"
              : "glass-card border border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package size={14} />
            <span className="text-xs">Tổng mặt hàng</span>
          </div>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>

        {/* Card 2: Giá trị tồn kho */}
        <div className="glass-card rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp size={14} />
            <span className="text-xs">Giá trị tồn kho</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
        </div>

        {/* Card 3: Giá trị tồn (Bảo hiểm) */}
        <div className="glass-card rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp size={14} />
            <span className="text-xs">Giá trị tồn (BH)</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{formatCurrency(totalInsuranceValue)}</p>
        </div>

        {/* Card 3: Sắp hết hàng */}
        <div
          onClick={() => setStatFilter("low")}
          className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
            statFilter === "low"
              ? "glass-card border-2 border-warning bg-warning/10 shadow-md shadow-warning/5 glow-amber"
              : "glass-card border border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center gap-2 text-warning mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs">Sắp hết hàng</span>
          </div>
          <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
        </div>

        {/* Card 4: Tồn cao */}
        <div
          onClick={() => setStatFilter("high")}
          className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
            statFilter === "high"
              ? "glass-card border-2 border-blue-500/50 bg-blue-500/10 shadow-md shadow-blue-500/5"
              : "glass-card border border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingDown size={14} />
            <span className="text-xs">Tồn cao</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{highStockCount}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc mã SKU..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none"><option value="">Tất cả nhóm</option>{categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <div><p className="text-sm font-semibold text-warning">Cảnh báo tồn kho thấp!</p><p className="text-xs text-muted-foreground mt-1">{lowStock.map((p: any) => `${p.name} (${p.stockCount}/${p.stockMin})`).join(", ")}</p></div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="data-table">
          <thead>
            <tr>
              <th>Mã SKU</th>
              <th>Tên phụ tùng</th>
              {(scope === "other" || user?.role === "ADMIN") && <th>Cơ sở</th>}
              <th>Nhóm</th>
              <th>ĐVT</th>
              <th>Tồn kho</th>
              <th>Giá Lẻ</th>
              <th>Giá Sỉ</th>
              <th>Giá BH</th>
              <th>Trạng thái</th>
              {(scope === "current" || user?.role === "ADMIN") && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => {
              const retail = p.prices?.find((pr: any) => pr.type === "RETAIL");
              const wholesale = p.prices?.find((pr: any) => pr.type === "WHOLESALE");
              const insurance = p.prices?.find((pr: any) => pr.type === "INSURANCE");
              const isSlowMoving = checkSlowMoving(p) === "SLOW_MOVING";
              return (
                <tr key={p.id}>
                  <td><div className="flex items-center gap-1">{p.parentId && <ChevronRight size={12} className="text-muted-foreground" />}<code className="text-xs bg-secondary/50 px-2 py-0.5 rounded">{p.sku}</code></div></td>
                  <td className="font-medium">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{p.name}</span>
                      {isSlowMoving && <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">Tồn lâu ngày</span>}
                    </div>
                  </td>
                  {(scope === "other" || user?.role === "ADMIN") && <td className="font-semibold text-primary">{p.branch?.name || "Hệ thống"}</td>}
                  <td><span className="badge badge-primary">{p.category}</span></td>
                  <td className="text-muted-foreground">{p.unit}{p.conversionUnit && <span className="text-xs block">1 {p.conversionUnit} = {p.conversionFactor} {p.unit}</span>}</td>
                  <td><span className={`font-semibold ${p.stockCount <= p.stockMin ? "text-destructive" : ""}`}>{formatNumber(p.stockCount)}</span><span className="text-xs text-muted-foreground ml-1">/{p.stockMin}-{p.stockMax}</span></td>
                  <td>{retail ? formatCurrency(Number(retail.amount)) : "—"}</td>
                  <td>{wholesale ? formatCurrency(Number(wholesale.amount)) : "—"}</td>
                  <td>{insurance ? formatCurrency(Number(insurance.amount)) : "—"}</td>
                  <td><span className={`badge ${statusBadge(p.status)}`}>{statusText(p.status)}</span></td>
                  {(scope === "current" || user?.role === "ADMIN") && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-primary"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Hiển thị {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalCount)} / {totalCount} phụ tùng
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(1); setLoading(true); }}
              disabled={page === 1}
              className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => { setPage(p => p - 1); setLoading(true); }}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => { setPage(p); setLoading(true); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    p === page
                      ? "border-primary bg-primary text-white"
                      : "border-border hover:bg-secondary/40"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => { setPage(p => p + 1); setLoading(true); }}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => { setPage(totalPages); setLoading(true); }}
              disabled={page === totalPages}
              className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}
      </div>

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật phụ tùng" : "Thêm phụ tùng mới"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formMessage && (
                <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${formMessage.type === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"}`}>
                  {formMessage.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã SKU</label>
                  <input required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: LG-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên phụ tùng</label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Lọc gió điều hòa" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nhóm hàng</label>
                  <input required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Lọc" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Đơn vị tính</label>
                  <input required value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Cái" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã sản phẩm cha (Mã hàng đa tầng)</label>
                <select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="">-- Không có (Sản phẩm gốc) --</option>
                  {products.filter((p: any) => !p.parentId && p.id !== editingId).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số lượng tồn</label>
                  <NumericInput
                    required
                    value={formData.stockCount}
                    onChange={(val: any) => setFormData({ ...formData, stockCount: val })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Min an toàn</label>
                  <NumericInput
                    required
                    value={formData.stockMin}
                    onChange={(val: any) => setFormData({ ...formData, stockMin: val })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Max an toàn</label>
                  <NumericInput
                    required
                    value={formData.stockMax}
                    onChange={(val: any) => setFormData({ ...formData, stockMax: val })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/40">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá bán lẻ</label>
                  <NumericInput
                    required
                    value={formData.retailPrice}
                    onChange={(val: any) => setFormData({ ...formData, retailPrice: val })}
                    className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá bán sỉ</label>
                  <NumericInput
                    required
                    value={formData.wholesalePrice}
                    onChange={(val: any) => setFormData({ ...formData, wholesalePrice: val })}
                    className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá Bảo hiểm</label>
                  <NumericInput
                    required
                    value={formData.insurancePrice}
                    onChange={(val: any) => setFormData({ ...formData, insurancePrice: val })}
                    className="w-full px-2 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" disabled={submitting} className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "Đang lưu..." : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <InventoryContent />
    </Suspense>
  );
}
