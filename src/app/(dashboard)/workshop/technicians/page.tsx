"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { UserCog, Plus, Loader2, Edit, Trash2, X } from "lucide-react";

export default function TechniciansPage() {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    phone: "",
    commissionRate: 0,
    status: "IDLE",
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/technicians");
      const data = await res.json();
      setTechs(data.technicians || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa KTV này?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ code: "", name: "", phone: "", commissionRate: 0, status: "IDLE" });
    setModalOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({
      code: t.code,
      name: t.name,
      phone: t.phone || "",
      commissionRate: 0,
      status: t.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/technicians/${editingId}` : "/api/technicians";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && techs.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Kỹ thuật viên (KTV)</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý hồ sơ nhân sự xưởng và phân công công việc</p>
        </div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <Plus size={16} /> Thêm KTV mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã KTV</th>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Trạng thái</th>
              <th>Số lệnh đã sửa</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t: any) => (
              <tr key={t.id}>
                <td><code className="text-xs font-bold text-primary">{t.code}</code></td>
                <td className="font-semibold">{t.name}</td>
                <td>{t.phone || "—"}</td>
                <td>
                  <span className={`badge ${t.status === "IDLE" ? "badge-success" : "badge-warning"}`}>
                    {t.status === "IDLE" ? "Đang rảnh" : "Đang làm việc"}
                  </span>
                </td>
                <td>{t.completedOrders}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(t)} className="p-1 hover:bg-secondary rounded text-primary"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-secondary rounded text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật KTV" : "Thêm KTV mới"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Mã KTV (Mã số nhân viên)</label>
                  <input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: KTV01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên KTV</label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Nguyễn Văn Hùng" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số điện thoại</label>
                <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 0901234567" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái công việc</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="IDLE">Đang rảnh (Idle)</option>
                  <option value="WORKING">Đang làm việc (Working)</option>
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
