"use client";
import { useEffect, useState } from "react";
import { formatCurrency, statusText, statusBadge, handleNumericInputChange } from "@/lib/utils";
import { NumericInput } from "@/components/NumericInput";
import { Car, Plus, Search, Grid3X3, List, Eye, Edit, Trash2, X, Loader2, Upload } from "lucide-react";

const COLOR_DOT: Record<string, string> = { "Đen": "bg-gray-800", "Trắng": "bg-white border border-border", "Bạc": "bg-gray-400", "Đỏ": "bg-red-500", "Xanh": "bg-blue-500" };

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("AVAILABLE");
  const [view, setView] = useState<"grid" | "list">("list");
  const [uploading, setUploading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const [formData, setFormData] = useState<{
    vin: string;
    sku: string;
    engineNumber: string;
    importPrice: number | "";
    importDate: string;
    stockCount: string;
    branchInput: string;
    model: string;
    variant: string;
    color: string;
    year: number | "";
    listPrice: number | "";
    floorPrice: number | "";
    status: string;
    image: string;
  }>({
    vin: "",
    sku: "",
    engineNumber: "",
    importPrice: "",
    importDate: new Date().toISOString().slice(0, 10),
    stockCount: "",
    branchInput: "",
    model: "",
    variant: "",
    color: "",
    year: 2026,
    listPrice: "",
    floorPrice: "",
    status: "AVAILABLE",
    image: "",
  });

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []))
      .catch(console.error);

    fetch("/api/inventory?limit=200")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(console.error);
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusF) params.set("status", statusF);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, statusF]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa xe này?")) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      vin: "",
      sku: "",
      engineNumber: "",
      importPrice: "",
      importDate: new Date().toISOString().slice(0, 10),
      stockCount: "",
      branchInput: "",
      model: "",
      variant: "",
      color: "",
      year: 2026,
      listPrice: "",
      floorPrice: "",
      status: "AVAILABLE",
      image: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v: any) => {
    setEditingId(v.id);
    const brName = v.warehouse || "";
    setFormData({
      vin: v.vin,
      sku: v.sku || "",
      engineNumber: v.engineNumber || "",
      importPrice: v.importPrice ? Number(v.importPrice) : "",
      importDate: v.importDate ? new Date(v.importDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      stockCount: v.stockCount || "",
      branchInput: brName,
      model: v.model,
      variant: v.variant || "",
      color: v.color || "",
      year: v.year,
      listPrice: Number(v.listPrice),
      floorPrice: Number(v.floorPrice),
      status: v.status,
      image: v.image || "",
    });
    setModalOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const resData = await res.json();
      if (resData.url) {
        setFormData((prev) => ({ ...prev, image: resData.url }));
      } else {
        alert("Upload thất bại: " + (resData.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/sales/${editingId}` : "/api/sales";

      const payload = {
        ...formData,
        year: Number(formData.year) || 2026,
        listPrice: Number(formData.listPrice) || 0,
        floorPrice: Number(formData.floorPrice) || 0,
        importPrice: Number(formData.importPrice) || 0,
        stockCount: formData.stockCount.trim(),
        warehouse: formData.branchInput.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert("Lỗi khi lưu thông tin xe: " + (errorData.error || "Lỗi không xác định từ hệ thống"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const vehicles = data?.vehicles || [];
  const counts = data?.counts || {};

  // Collect unique values for search suggestions in modal
  const uniqueSKUs: string[] = Array.from(new Set([
    ...vehicles.map((v: any) => v.sku as string).filter(Boolean),
    ...products.map((p: any) => p.sku as string).filter(Boolean)
  ]));
  
  const uniqueModels: string[] = Array.from(new Set(
    vehicles.map((v: any) => v.model as string).filter(Boolean)
  ));
  
  const uniqueVariants: string[] = Array.from(new Set(
    vehicles.map((v: any) => v.variant as string).filter(Boolean)
  ));
  
  const uniqueColors: string[] = Array.from(new Set([
    "Đen", "Trắng", "Bạc", "Đỏ", "Xanh", "Vàng", "Xám",
    ...vehicles.map((v: any) => v.color as string).filter(Boolean)
  ]));

  const uniqueWarehouses: string[] = Array.from(new Set(
    vehicles.map((v: any) => v.warehouse as string).filter(Boolean)
  ));
  const uniqueStockCounts: string[] = Array.from(new Set(
    vehicles.map((v: any) => v.stockCount as string).filter(Boolean)
  ));

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Kho xe</h2></div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"><Plus size={16} />Thêm xe mới</button>
      </div>

      {/* Inventory KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-primary/5 via-transparent to-transparent border border-primary/10 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-primary opacity-20">
            <Car size={36} />
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng xe còn tồn</p>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {counts.remainingCount || 0} <span className="text-xs font-medium text-muted-foreground">xe</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Gồm Sẵn sàng ({counts.AVAILABLE || 0}), Đặt cọc ({counts.RESERVED || 0}), Đang về ({counts.INCOMING || 0})
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent border border-emerald-500/10 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-500 opacity-20">
            <span className="text-xl font-bold font-mono">VNĐ</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giá trị tồn (Niêm yết)</p>
          <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
            {formatCurrency(counts.remainingListValue || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tính theo giá bán niêm yết hiện hành
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent border border-blue-500/10 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-blue-500 opacity-20">
            <span className="text-xl font-bold font-mono">VNĐ</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giá trị tồn (Nhập)</p>
          <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
            {formatCurrency(counts.remainingImportValue || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Tính theo tổng giá nhập kho hiện hành
          </p>
        </div>
      </div>

      {/* Quick Status Filter Buttons */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["AVAILABLE", "RESERVED", "INCOMING", "SOLD"] as const).map((s) => (
            <div 
              key={s} 
              className={`glass-card rounded-xl py-2.5 px-3.5 transition-all duration-200 cursor-pointer border hover:-translate-y-0.5 ${
                statusF === s 
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                  : "border-border/60 hover:border-border"
              }`}
              onClick={() => setStatusF(statusF === s ? "" : s)}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    s === "AVAILABLE" ? "bg-emerald-500" :
                    s === "RESERVED" ? "bg-amber-500" :
                    s === "INCOMING" ? "bg-blue-500" : "bg-gray-400"
                  }`} />
                  <span className="text-xs text-muted-foreground font-semibold truncate">{statusText(s)}</span>
                </div>
                <span className="text-sm font-black text-foreground shrink-0">{counts[s] || 0} xe</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Tìm theo model hoặc VIN..." 
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" 
          />
        </div>
        <select 
          value={statusF} 
          onChange={(e) => setStatusF(e.target.value)} 
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px]"
        >
          <option value="AVAILABLE">Sẵn sàng (Available)</option>
          <option value="RESERVED">Đã đặt cọc (Reserved)</option>
          <option value="INCOMING">Đang về (Incoming)</option>
          <option value="SOLD">Đã bán (Sold)</option>
          <option value="">Tất cả xe hoạt động</option>
        </select>
        <div className="flex bg-card border border-border rounded-xl overflow-hidden shrink-0">
          <button onClick={() => setView("grid")} className={`px-3 py-2 text-xs ${view === "grid" ? "bg-primary text-white" : ""}`}><Grid3X3 size={14} /></button>
          <button onClick={() => setView("list")} className={`px-3 py-2 text-xs ${view === "list" ? "bg-primary text-white" : ""}`}><List size={14} /></button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map((v: any) => (
            <div key={v.id} className="glass-card rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group flex flex-col h-full border border-border/40">
              {/* Image / Thumbnail Section */}
              <div className="h-32 bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center relative overflow-hidden border-b border-border/30 shrink-0">
                {v.image ? (
                  <img src={v.image} alt={v.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                      <Car size={20} className="text-primary/40" />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Chưa cập nhật ảnh</span>
                  </div>
                )}
                {/* Status Badge */}
                <span className={`badge ${statusBadge(v.status)} absolute top-2 right-2 text-[9px] px-1.5 py-0.5 shadow-sm backdrop-blur-md`}>
                  {statusText(v.status)}
                </span>
              </div>

              {/* Content Section */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase">{v.sku || "Chưa gán mã"}</span>
                      <h3 className="text-sm font-bold text-primary tracking-tight group-hover:underline mt-1 line-clamp-1">{v.model}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">{v.variant || "—"}</p>
                    </div>
                  </div>

                  {/* Attribute Tags Grid */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    {/* Color Tag */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 border border-border/20 rounded-md text-[10px] text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[v.color] || "bg-gray-500"}`} />
                      <span className="truncate">{v.color || "Không màu"}</span>
                    </div>
                    {/* VIN Tag */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 border border-border/20 rounded-md text-[10px] min-w-0">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold shrink-0">VIN:</span>
                      <code className="text-foreground font-mono font-bold truncate">{v.vin}</code>
                    </div>
                    {/* Engine Number Tag */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 border border-border/20 rounded-md text-[10px] min-w-0">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold shrink-0">MÁY:</span>
                      <code className="text-foreground font-mono font-bold truncate">{v.engineNumber || "—"}</code>
                    </div>
                    {/* Branch Tag */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 border border-border/20 rounded-md text-[10px] min-w-0">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold shrink-0">KHO:</span>
                      <span className="text-foreground font-bold truncate">{v.warehouse || "Chưa gán"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 px-1">
                    <span>Số tồn kho: <strong className="text-foreground font-mono">{v.stockCount || "—"}</strong></span>
                    <span>Nhập: <strong>{v.importDate ? new Date(v.importDate).toLocaleDateString("vi-VN") : "—"}</strong></span>
                  </div>

                  {/* Divider */}
                  <div className="my-2.5 border-t border-border/40" />

                  {/* Pricing Box */}
                  <div className="grid grid-cols-2 gap-2 bg-secondary/30 border border-border/40 p-2.5 rounded-lg">
                    <div>
                      <p className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">Giá nhập</p>
                      <p className="text-xs font-extrabold text-amber-600 tracking-tight mt-0.5">{v.importPrice ? formatCurrency(Number(v.importPrice)) : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Giá bán lẻ</p>
                      <p className="text-xs font-extrabold text-emerald-600 tracking-tight mt-0.5">{formatCurrency(Number(v.listPrice))}</p>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="mt-3 pt-2.5 border-t border-border/30 flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(v)} 
                    className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary hover:text-white transition-all duration-200 flex items-center justify-center gap-1 border border-primary/15"
                  >
                    <Edit size={12} />Sửa
                  </button>
                  <button 
                    onClick={() => handleDelete(v.id)} 
                    className="flex-1 py-1.5 rounded-lg bg-destructive/5 text-destructive text-[11px] font-semibold hover:bg-destructive hover:text-white transition-all duration-200 flex items-center justify-center gap-1 border border-destructive/10"
                  >
                    <Trash2 size={12} />Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã SP / VIN</th>
                <th>Thông tin xe</th>
                <th>Kho</th>
                <th>Giá bán lẻ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v: any) => (
                <tr key={v.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {v.image ? (
                        <img src={v.image} alt={v.model} className="w-10 h-10 rounded-lg object-cover bg-secondary border border-border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0">
                          <Car size={16} className="text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono">{v.sku || "N/A"}</span>
                        <code className="text-[10px] text-muted-foreground">{v.vin}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary">{v.model}</span>
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {v.variant || "—"} · {v.color || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="text-xs font-semibold">{v.warehouse || "Chưa gán"}</td>
                  <td className="font-bold text-emerald-600 text-xs">{formatCurrency(Number(v.listPrice))}</td>
                  <td><span className={`badge ${statusBadge(v.status)} text-[10px]`}>{statusText(v.status)}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setSelectedVehicle(v); setDetailOpen(true); }} 
                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(v)} 
                        className="p-1.5 hover:bg-secondary rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        title="Sửa"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)} 
                        className="p-1.5 hover:bg-secondary rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật thông tin xe" : "Thêm xe mới"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã Sản phẩm</label>
                  <input 
                    list="sku-list" 
                    value={formData.sku} 
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: MP-001..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5 uppercase">Tên xe (Dòng xe)</label>
                  <input 
                    list="model-list" 
                    value={formData.model} 
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })} 
                    className="w-full px-3 py-2 bg-primary/5 border border-primary/30 rounded-xl text-sm font-bold text-primary focus:ring-2 focus:ring-primary/40 outline-none" 
                    placeholder="VD: Toyota Camry" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phiên bản</label>
                  <input 
                    list="variant-list" 
                    value={formData.variant} 
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: 2.5Q" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Màu sắc</label>
                  <input 
                    list="color-list" 
                    value={formData.color} 
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: Đen, Trắng..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số tồn kho</label>
                  <input 
                    type="text" 
                    list="stockCount-list" 
                    value={formData.stockCount} 
                    onChange={(e) => setFormData({ ...formData, stockCount: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: N633-SN-25-00000148..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái xe</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="AVAILABLE">Sẵn có (Available)</option>
                    <option value="RESERVED">Đặt cọc (Reserved)</option>
                    <option value="INCOMING">Đang về (Incoming)</option>
                    <option value="SOLD">Đã bán (Sold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số khung (VIN)</label>
                  <input 
                    value={formData.vin} 
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: JTDKN3DU5..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số Động cơ</label>
                  <input 
                    value={formData.engineNumber} 
                    onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="VD: 2AR-FE..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-600 mb-1.5 uppercase">Giá nhập</label>
                  <NumericInput
                    value={formData.importPrice}
                    onChange={(cleanVal) => {
                      setFormData({ ...formData, importPrice: cleanVal === "" ? "" : parseInt(cleanVal, 10) });
                    }}
                    className="w-full px-3 py-2 bg-amber-500/5 border border-amber-500/30 rounded-xl text-sm font-extrabold text-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1.5 uppercase">Giá bán lẻ</label>
                  <NumericInput
                    value={formData.listPrice}
                    onChange={(cleanVal) => {
                      setFormData({ ...formData, listPrice: cleanVal === "" ? "" : parseInt(cleanVal, 10) });
                    }}
                    className="w-full px-3 py-2 bg-emerald-500/5 border border-emerald-500/30 rounded-xl text-sm font-extrabold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Kho (Chi nhánh)</label>
                  <input 
                    list="branch-list" 
                    value={formData.branchInput} 
                    onChange={(e) => setFormData({ ...formData, branchInput: e.target.value })} 
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="Chọn hoặc nhập kho..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Ngày nhập</label>
                  <input
                    type="date"
                    value={formData.importDate}
                    onChange={(e) => setFormData({ ...formData, importDate: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Ảnh xe</label>
                  <div className="flex items-center gap-4">
                    {formData.image ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border bg-secondary shrink-0">
                        <img src={formData.image} alt="Vehicle preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: "" })}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 shadow hover:bg-destructive/80 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/20 hover:border-primary/50 transition-all shrink-0">
                        {uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground mt-1 font-semibold">Tải lên</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                      </label>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Ảnh đại diện xe</p>
                      <p>Hỗ trợ định dạng JPG, PNG, WEBP.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {detailOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Car className="text-primary" size={20} /> Chi tiết phương tiện
              </h3>
              <button onClick={() => setDetailOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Header Info with Image */}
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start pb-4 border-b border-border/50">
                {selectedVehicle.image ? (
                  <img 
                    src={selectedVehicle.image} 
                    alt={selectedVehicle.model} 
                    className="w-32 h-32 rounded-xl object-cover border border-border bg-secondary shrink-0"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-secondary flex flex-col items-center justify-center border border-border text-muted-foreground shrink-0">
                    <Car size={36} className="opacity-40 mb-1" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Không có ảnh</span>
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wider">
                    {selectedVehicle.sku || "Chưa gán SKU"}
                  </span>
                  <h2 className="text-xl font-extrabold text-foreground">{selectedVehicle.model}</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    Phiên bản: {selectedVehicle.variant || "—"}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className={`badge ${statusBadge(selectedVehicle.status)} text-xs px-2.5 py-0.5`}>
                      {statusText(selectedVehicle.status)}
                    </span>
                    <span className="px-2 py-0.5 bg-secondary text-foreground text-xs rounded-md font-semibold border border-border">
                      Màu: {selectedVehicle.color || "—"}
                    </span>
                    <span className="px-2 py-0.5 bg-secondary text-foreground text-xs rounded-md font-semibold border border-border">
                      Kho: {selectedVehicle.warehouse || "Chưa gán"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                    Thông tin định danh
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Số khung (VIN)</span>
                      <code className="font-mono font-bold text-foreground">{selectedVehicle.vin}</code>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Số Động cơ</span>
                      <code className="font-mono font-bold text-foreground">{selectedVehicle.engineNumber || "—"}</code>
                    </div>

                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Số tồn kho (Mã)</span>
                      <span className="font-bold font-mono text-foreground">{selectedVehicle.stockCount || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 border-b border-amber-600/10 pb-1">
                    Thông tin tài chính
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Giá nhập kho</span>
                      <span className="font-extrabold text-amber-600">
                        {selectedVehicle.importPrice ? formatCurrency(Number(selectedVehicle.importPrice)) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Giá bán lẻ niêm yết</span>
                      <span className="font-extrabold text-emerald-600">
                        {formatCurrency(Number(selectedVehicle.listPrice))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                      <span className="text-muted-foreground font-medium">Ngày nhập kho</span>
                      <span className="font-semibold text-foreground">
                        {selectedVehicle.importDate ? new Date(selectedVehicle.importDate).toLocaleDateString("vi-VN") : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedVehicle.notes && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    Ghi chú bổ sung
                  </h4>
                  <p className="text-sm text-muted-foreground mt-2 bg-secondary/30 p-3 rounded-xl border border-border/50 whitespace-pre-wrap">
                    {selectedVehicle.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-4 bg-secondary/20 border-t border-border">
              <button 
                type="button" 
                onClick={() => setDetailOpen(false)} 
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unique datalists for auto-suggestions */}
      <datalist id="stockCount-list">
        {uniqueStockCounts.map(sc => (
          <option key={sc} value={sc} />
        ))}
      </datalist>
      <datalist id="sku-list">
        {uniqueSKUs.map(sku => (
          <option key={sku} value={sku} />
        ))}
      </datalist>
      <datalist id="model-list">
        {uniqueModels.map(model => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <datalist id="variant-list">
        {uniqueVariants.map(variant => (
          <option key={variant} value={variant} />
        ))}
      </datalist>
      <datalist id="color-list">
        {uniqueColors.map(color => (
          <option key={color} value={color} />
        ))}
      </datalist>
      <datalist id="branch-list">
        {uniqueWarehouses.map(w => (
          <option key={w} value={w} />
        ))}
      </datalist>
    </div>
  );
}
