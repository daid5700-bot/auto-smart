"use client";

import { useEffect, useState } from "react";
import { formatCurrency, statusBadge, statusText } from "@/lib/utils";
import { 
  DollarSign, 
  Loader2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Building2, 
  ChevronRight, 
  PackageOpen,
  Filter
} from "lucide-react";
import { useAuth } from "@/lib/store";

export default function PricingPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [scope, setScope] = useState<"current" | "other">("current");
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 20;

  // Editing Prices State
  const [retailPrice, setRetailPrice] = useState<number | "">(0);
  const [wholesalePrice, setWholesalePrice] = useState<number | "">(0);
  const [insurancePrice, setInsurancePrice] = useState<number | "">(0);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (catFilter) params.set("category", catFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (user?.role === "ADMIN") {
        params.set("branchFilter", branchFilter);
      } else {
        params.set("scope", scope);
      }
      
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (e) {
      console.error("Error fetching pricing products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, catFilter, scope, branchFilter, user, page]);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(console.error);
  }, []);

  const handleStartEdit = (p: any) => {
    setEditingId(p.id);
    const retail = p.prices.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
    const wholesale = p.prices.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
    const insurance = p.prices.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;
    setRetailPrice(Number(retail));
    setWholesalePrice(Number(wholesale));
    setInsurancePrice(Number(insurance));
  };

  const handleSave = async (productId: number) => {
    try {
      setLoading(true);
      const prices = [
        { type: "RETAIL", amount: Number(retailPrice) || 0 },
        { type: "WHOLESALE", amount: Number(wholesalePrice) || 0 },
        { type: "INSURANCE", amount: Number(insurancePrice) || 0 },
      ];
      const res = await fetch(`/api/inventory/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchData();
      }
    } catch (e) {
      console.error("Error updating prices:", e);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCatFilter("");
    setBranchFilter("all");
    setScope("current");
    setPage(1);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Bảng giá phụ tùng</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Cấu hình đa bảng giá (Giá bán lẻ, Giá bán buôn/đại lý, Giá bảo hiểm) trên từng cơ sở.
          </p>
        </div>
      </div>

      {/* Scope Selector Tabs for non-ADMIN */}
      {user?.role !== "ADMIN" && (
        <div className="flex border-b border-border">
          <button
            onClick={() => { setScope("current"); setPage(1); setLoading(true); }}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
              scope === "current"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Cơ sở hiện tại
          </button>
          <button
            onClick={() => { setScope("other"); setPage(1); setLoading(true); }}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Tìm theo tên hoặc mã SKU..." 
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" 
          />
        </div>

        {user?.role === "ADMIN" && (
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1">
            <Building2 size={14} className="text-muted-foreground" />
            <select 
              value={branchFilter} 
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); setLoading(true); }} 
              className="bg-transparent border-none text-sm outline-none cursor-pointer py-1.5 pl-1 pr-6 focus:ring-0"
            >
              <option value="all">Tất cả cơ sở</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1">
          <Filter size={14} className="text-muted-foreground" />
          <select 
            value={catFilter} 
            onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} 
            className="bg-transparent border-none text-sm outline-none cursor-pointer py-1.5 pl-1 pr-6 focus:ring-0"
          >
            <option value="">Tất cả nhóm</option>
            {categories.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid / Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border shadow-xl">
        <div className="overflow-x-auto">
          {products.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[12%]">SKU</th>
                  <th className="w-[28%]">Tên phụ tùng</th>
                  {(scope === "other" || user?.role === "ADMIN") && <th className="w-[12%]">Cơ sở</th>}
                  <th className="w-[10%]">Đơn vị</th>
                  <th className="w-[14%]">Giá Bán Lẻ</th>
                  <th className="w-[14%]">Giá Bán Sỉ</th>
                  <th className="w-[14%]">Giá Bảo Hiểm</th>
                  <th className="w-[10%] text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const isEditing = editingId === p.id;
                  const retail = p.prices.find((pr: any) => pr.type === "RETAIL")?.amount || 0;
                  const wholesale = p.prices.find((pr: any) => pr.type === "WHOLESALE")?.amount || 0;
                  const insurance = p.prices.find((pr: any) => pr.type === "INSURANCE")?.amount || 0;

                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td>
                        <div className="flex items-center gap-1">
                          {p.parentId && <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
                          <code className="text-[11px] font-mono bg-secondary/60 px-2 py-0.5 rounded text-foreground font-semibold">
                            {p.sku}
                          </code>
                        </div>
                      </td>
                      <td className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Nhóm: {p.category}</span>
                        </div>
                      </td>
                      {(scope === "other" || user?.role === "ADMIN") && (
                        <td className="font-semibold text-primary text-xs">
                          {p.branch?.name || "Hệ thống"}
                        </td>
                      )}
                      <td className="text-muted-foreground text-xs">{p.unit}</td>
                       <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            value={retailPrice === "" ? "" : Number(retailPrice).toLocaleString("vi-VN")} 
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, "");
                              setRetailPrice(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                            }} 
                            className="w-full px-2 py-1.5 bg-secondary/40 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none text-primary" 
                          />
                        ) : (
                          <span className="font-bold text-primary text-xs">{formatCurrency(Number(retail))}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            value={wholesalePrice === "" ? "" : Number(wholesalePrice).toLocaleString("vi-VN")} 
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, "");
                              setWholesalePrice(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                            }} 
                            className="w-full px-2 py-1.5 bg-secondary/40 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none text-success" 
                          />
                        ) : (
                          <span className="font-bold text-success text-xs">{formatCurrency(Number(wholesale))}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            value={insurancePrice === "" ? "" : Number(insurancePrice).toLocaleString("vi-VN")} 
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/\D/g, "");
                              setInsurancePrice(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                            }} 
                            className="w-full px-2 py-1.5 bg-secondary/40 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none text-purple-600" 
                          />
                        ) : (
                          <span className="font-bold text-purple-600 text-xs">{formatCurrency(Number(insurance))}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isEditing ? (
                          <div className="flex gap-1.5 justify-center">
                            <button 
                              onClick={() => handleSave(p.id)} 
                              className="p-1.5 bg-success/15 text-success hover:bg-success/25 rounded-lg transition-all"
                              title="Lưu"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              className="p-1.5 bg-destructive/15 text-destructive hover:bg-destructive/25 rounded-lg transition-all"
                              title="Hủy"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartEdit(p)} 
                            className="mx-auto px-2.5 py-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground flex items-center gap-1.5 text-xs font-semibold transition-all"
                          >
                            <Edit2 size={12} /> Sửa giá
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <PackageOpen size={48} className="text-muted-foreground/60 animate-bounce" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Không có phụ tùng nào</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Không tìm thấy phụ tùng phù hợp với bộ lọc hiện tại hoặc cơ sở được chọn chưa có hàng.
                </p>
              </div>
              <button 
                onClick={clearFilters}
                className="text-xs text-primary font-semibold border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/5 transition-all"
              >
                Xóa bộ lọc / Hiển thị tất cả
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
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
  );
}
