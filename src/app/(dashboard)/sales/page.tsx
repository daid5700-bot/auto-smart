"use client";
import { useEffect, useState } from "react";
import { formatCurrency, statusText, statusBadge } from "@/lib/utils";
import { Car, Plus, Search, Grid3X3, List, Eye, Edit, Trash2, X, Loader2 } from "lucide-react";

const COLOR_DOT: Record<string, string> = { "Đen": "bg-gray-800", "Trắng": "bg-white border border-border", "Bạc": "bg-gray-400", "Đỏ": "bg-red-500", "Xanh": "bg-blue-500" };

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    vin: "",
    model: "",
    variant: "",
    color: "Đen",
    year: 2026,
    listPrice: 0,
    floorPrice: 0,
    status: "AVAILABLE",
  });

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusF) params.set("status", statusF);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [search, statusF]);

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
      listPrice: 0,
      floorPrice: 0,
      status: "AVAILABLE",
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
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/sales/${editingId}` : "/api/sales";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
        <div><h2 className="text-2xl font-bold">Kho xe</h2><p className="text-muted-foreground text-sm mt-1">Dữ liệu realtime từ PostgreSQL</p></div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"><Plus size={16} />Thêm xe mới</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["AVAILABLE", "RESERVED", "INCOMING", "SOLD"] as const).map((s) => (
          <div key={s} className="glass-card rounded-xl p-4 hover:-translate-y-0.5 transition-transform cursor-pointer" onClick={() => setStatusF(statusF === s ? "" : s)}>
            <p className="text-xs text-muted-foreground">{statusText(s)}</p>
            <p className="text-2xl font-bold mt-1">{counts[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo model hoặc VIN..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
        <div className="flex bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-3 py-2 text-xs ${view === "grid" ? "bg-primary text-white" : ""}`}><Grid3X3 size={14} /></button>
          <button onClick={() => setView("list")} className={`px-3 py-2 text-xs ${view === "list" ? "bg-primary text-white" : ""}`}><List size={14} /></button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v: any) => (
            <div key={v.id} className="glass-card rounded-xl overflow-hidden hover:-translate-y-1 transition-transform group">
              <div className="h-40 bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center relative">
                <Car size={64} className="text-muted-foreground/20" />
                <span className={`badge ${statusBadge(v.status)} absolute top-3 right-3`}>{statusText(v.status)}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold">{v.model}</h3>
                <p className="text-sm text-muted-foreground">{v.variant} • {v.year}</p>
                <div className="flex items-center gap-2 mt-2"><div className={`w-4 h-4 rounded-full ${COLOR_DOT[v.color] || "bg-gray-500"}`} /><span className="text-xs text-muted-foreground">{v.color}</span></div>
                <div className="mt-4 pt-3 border-t border-border/30">
                  <p className="text-lg font-bold text-primary">{formatCurrency(Number(v.listPrice))}</p>
                  <p className="text-[10px] text-muted-foreground">Floor: {formatCurrency(Number(v.floorPrice))}</p>
                </div>
                <code className="text-[10px] bg-secondary/50 px-2 py-1 rounded mt-2 inline-block">VIN: {v.vin?.slice(-8)}</code>
                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(v)} className="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 flex items-center justify-center gap-1"><Edit size={12} />Sửa</button>
                  <button onClick={() => handleDelete(v.id)} className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 flex items-center justify-center gap-1"><Trash2 size={12} />Xóa</button>
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
              <td><code className="text-xs">{v.vin?.slice(-8)}</code></td>
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
                  <input type="number" required value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2026 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá niêm yết</label>
                  <input type="number" required value={formData.listPrice} onChange={(e) => setFormData({ ...formData, listPrice: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giá sàn (Floor)</label>
                  <input type="number" required value={formData.floorPrice} onChange={(e) => setFormData({ ...formData, floorPrice: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none" />
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
