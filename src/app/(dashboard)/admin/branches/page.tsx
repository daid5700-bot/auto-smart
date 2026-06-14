"use client";
import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Edit, Trash2, X, MapPin, Phone } from "lucide-react";
import { useAuth } from "@/lib/store";

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cơ sở/chi nhánh "${name}"?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi xóa chi nhánh");
      }
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingId(b.id);
    setFormData({
      name: b.name,
      address: b.address || "",
      phone: b.phone || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Tên cơ sở không được để trống!");
      return;
    }
    try {
      setLoading(true);
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/branches/${editingId}` : "/api/branches";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi xử lý cơ sở");
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-destructive font-bold text-lg">Quyền truy cập bị từ chối</p>
        <p className="text-muted-foreground text-sm mt-1">Chỉ Quản trị viên (ADMIN) mới có quyền truy cập trang này.</p>
      </div>
    );
  }

  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản lý cơ sở hệ thống</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Danh sách chi nhánh/cơ sở dịch vụ ô tô thuộc mạng lưới kinh doanh của AUTO-SMART
          </p>
        </div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <Plus size={16} /> Thêm cơ sở mới
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo tên, địa chỉ, số điện thoại..."
          className="max-w-md w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading && branches.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên Cơ sở</th>
                <th>Địa chỉ</th>
                <th>Điện thoại</th>
                <th>Ngày khởi tạo</th>
                <th className="w-[120px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white">
                        <Building2 size={16} />
                      </div>
                      <span className="font-bold text-foreground text-base">{b.name}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="shrink-0" />
                      <span>{b.address || "—"}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="shrink-0" />
                      <span>{b.phone || "—"}</span>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-all"
                        title="Chỉnh sửa"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-destructive transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBranches.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy cơ sở nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingId ? "Cập nhật cơ sở" : "Thêm cơ sở mới"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/50"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tên cơ sở/chi nhánh *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Chi nhánh Quận 9"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Nhập địa chỉ chi tiết"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Nhập số điện thoại liên hệ"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-border hover:bg-secondary text-foreground text-sm font-semibold rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
