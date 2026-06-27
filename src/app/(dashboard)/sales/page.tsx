"use client";
import { useEffect, useState } from "react";
import { formatCurrency, statusText, statusBadge } from "@/lib/utils";
import { Car, Plus, Search, Grid3X3, List, Eye, Edit, Trash2, X, Loader2, Upload } from "lucide-react";

const COLOR_DOT: Record<string, string> = { "Đen": "bg-gray-800", "Trắng": "bg-white border border-border", "Bạc": "bg-gray-400", "Đỏ": "bg-red-500", "Xanh": "bg-blue-500" };

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    vin: string;
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
    model: "",
    variant: "",
    color: "Đen",
    year: 2026,
    listPrice: "",
    floorPrice: "",
    status: "AVAILABLE",
    image: "",
  });

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
      model: "",
      variant: "",
      color: "Đen",
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
    setFormData({
      vin: v.vin,
      model: v.model,
      variant: v.variant,
      color: v.color,
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
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const vehicles = data?.vehicles || [];
  const counts = data?.counts || {};

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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giá trị tồn (Giá sàn)</p>
          <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
            {formatCurrency(counts.remainingFloorValue || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Mức giá xuất xưởng tối thiểu cho phép
          </p>
        </div>
      </div>

      {/* Quick Status Filter Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["AVAILABLE", "RESERVED", "INCOMING", "SOLD"] as const).map((s) => (
            <div 
              key={s} 
              className={`glass-card rounded-xl p-4 transition-all duration-200 cursor-pointer border hover:-translate-y-0.5 ${
                statusF === s 
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                  : "border-border/60 hover:border-border"
              }`}
              onClick={() => setStatusF(statusF === s ? "" : s)}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">{statusText(s)}</p>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  s === "AVAILABLE" ? "bg-emerald-500" :
                  s === "RESERVED" ? "bg-amber-500" :
                  s === "INCOMING" ? "bg-blue-500" : "bg-gray-400"
                }`} />
              </div>
              <p className="text-xl font-bold mt-2 text-foreground">{counts[s] || 0} xe</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo model hoặc VIN..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
        <div className="flex bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-3 py-2 text-xs ${view === "grid" ? "bg-primary text-white" : ""}`}><Grid3X3 size={14} /></button>
          <button onClick={() => setView("list")} className={`px-3 py-2 text-xs ${view === "list" ? "bg-primary text-white" : ""}`}><List size={14} /></button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {vehicles.map((v: any) => (
            <div key={v.id} className="glass-card rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col h-full border border-border/40">
              {/* Image / Thumbnail Section */}
              <div className="h-48 bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50/30 flex items-center justify-center relative overflow-hidden border-b border-border/30 shrink-0">
                {v.image ? (
                  <img src={v.image} alt={v.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                      <Car size={32} className="text-primary/40" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Chưa cập nhật ảnh</span>
                  </div>
                )}
                {/* Status Badge */}
                <span className={`badge ${statusBadge(v.status)} absolute top-3 right-3 shadow-sm backdrop-blur-md`}>
                  {statusText(v.status)}
                </span>
                {/* Year Label */}
                <span className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  {v.year}
                </span>
              </div>

              {/* Content Section */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{v.model}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{v.variant}</p>
                    </div>
                  </div>

                  {/* Attribute Tags Grid */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {/* Color Tag */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/50 border border-border/20 rounded-lg text-xs text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${COLOR_DOT[v.color] || "bg-gray-500"}`} />
                      <span>{v.color}</span>
                    </div>
                    {/* VIN Tag */}
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-secondary/50 border border-border/20 rounded-lg text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">VIN:</span>
                      <code className="text-foreground font-mono">{v.vin?.slice(-8)}</code>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t border-border/40" />

                  {/* Pricing Box */}
                  <div className="flex items-baseline justify-between bg-primary/[0.02] border border-primary/[0.04] p-3 rounded-xl">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Giá niêm yết</p>
                      <p className="text-lg font-extrabold text-primary tracking-tight mt-0.5">{formatCurrency(Number(v.listPrice))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Giá sàn (Floor)</p>
                      <p className="text-xs font-bold text-foreground/80 mt-0.5">{formatCurrency(Number(v.floorPrice))}</p>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="mt-5 pt-4 border-t border-border/30 flex gap-2.5">
                  <button 
                    onClick={() => handleOpenEdit(v)} 
                    className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 border border-primary/15"
                  >
                    <Edit size={14} />Sửa
                  </button>
                  <button 
                    onClick={() => handleDelete(v.id)} 
                    className="flex-1 py-2 rounded-xl bg-destructive/5 text-destructive text-xs font-semibold hover:bg-destructive hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 border border-destructive/10"
                  >
                    <Trash2 size={14} />Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
          <thead><tr><th>VIN</th><th>Model</th><th>Phiên bản</th><th>Màu</th><th>Năm</th><th>Giá niêm yết</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{vehicles.map((v: any) => (
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
                  <code className="text-xs">{v.vin?.slice(-8)}</code>
                </div>
              </td>
              <td className="font-medium">{v.model}</td>
              <td>{v.variant}</td>
              <td><div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${COLOR_DOT[v.color] || "bg-gray-500"}`} />{v.color}</div></td>
              <td>{v.year}</td>
              <td className="font-semibold">{formatCurrency(Number(v.listPrice))}</td>
              <td><span className={`badge ${statusBadge(v.status)}`}>{statusText(v.status)}</span></td>
              <td>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenEdit(v)} className="p-1 hover:bg-secondary rounded text-primary"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(v.id)} className="p-1 hover:bg-secondary rounded text-destructive"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật thông tin xe" : "Thêm xe mới"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số khung (VIN)</label>
                  <input required value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: JTDKN3DU5..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Dòng xe (Model)</label>
                  <input required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Toyota Camry" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phiên bản</label>
                  <input required value={formData.variant} onChange={(e) => setFormData({ ...formData, variant: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 2.5Q" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Màu sắc</label>
                  <select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="Đen">Đen</option>
                    <option value="Trắng">Trắng</option>
                    <option value="Bạc">Bạc</option>
                    <option value="Đỏ">Đỏ</option>
                    <option value="Xanh">Xanh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Năm sản xuất</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value === "" ? "" : parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá niêm yết</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    required
                    value={formData.listPrice === "" ? "" : Number(formData.listPrice).toLocaleString("vi-VN")}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, listPrice: cleanVal === "" ? "" : parseInt(cleanVal, 10) });
                    }}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá sàn (Floor)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    required
                    value={formData.floorPrice === "" ? "" : Number(formData.floorPrice).toLocaleString("vi-VN")}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, floorPrice: cleanVal === "" ? "" : parseInt(cleanVal, 10) });
                    }}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái xe</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="AVAILABLE">Sẵn có (Available)</option>
                  <option value="RESERVED">Đặt cọc (Reserved)</option>
                  <option value="INCOMING">Đang về (Incoming)</option>
                  <option value="SOLD">Đã bán (Sold)</option>
                </select>
              </div>
              <div>
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
                    <p>Lưu trữ trực tiếp trong thư mục hệ thống.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
