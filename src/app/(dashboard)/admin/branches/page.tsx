"use client";
import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Edit, Trash2, X, MapPin, Phone, Upload } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useModal } from "@/components/ModalProvider";


export default function BranchesPage() {
  const modal = useModal();
  const { user, activeBranch, setActiveBranch } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    phone: "",
    logoUrl: "",
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
        setFormData((prev) => ({ ...prev, logoUrl: resData.url }));
      } else {
        await modal.alert({
          title: "Lỗi tải ảnh",
          message: resData.error || "Lỗi không xác định khi upload",
          type: "error",
        });
      }
    } catch (err: any) {
      await modal.alert({
        title: "Lỗi kết nối",
        message: "Lỗi upload: " + err.message,
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = await modal.confirm({
      title: "Xác nhận xóa chi nhánh",
      message: `Bạn có chắc chắn muốn xóa cơ sở/chi nhánh "${name}" không?`,
      type: "danger",
      confirmText: "Xóa ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi xóa chi nhánh");
      }
      await modal.alert({
        title: "Thành công",
        message: `Đã xóa cơ sở/chi nhánh "${name}" thành công!`,
        type: "success",
      });
      await fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Thất bại",
        message: e.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      code: "",
      name: "",
      address: "",
      phone: "",
      logoUrl: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingId(b.id);
    setFormData({
      code: b.code || "",
      name: b.name,
      address: b.address || "",
      phone: b.phone || "",
      logoUrl: b.logoUrl || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await modal.alert({
        title: "Cảnh báo",
        message: "Tên cơ sở không được để trống!",
        type: "warning",
      });
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
      await modal.alert({
        title: "Thành công",
        message: editingId ? "Cập nhật thông tin cơ sở thành công!" : "Tạo cơ sở mới thành công!",
        type: "success",
      });

      if (editingId && activeBranch && activeBranch.id === editingId) {
        setActiveBranch(data);
      }

      await fetchData();
    } catch (err: any) {
      await modal.alert({
        title: "Thất bại",
        message: err.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-destructive font-bold text-lg">Quyền truy cập bị từ chối</p>
        </div>
    );
  }

  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản lý cơ sở hệ thống</h2>
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
                <th className="w-[120px]">Mã Cơ sở</th>
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
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold border border-primary/20">
                      {b.code || "—"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      {b.logoUrl ? (
                        <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
                          <img src={b.logoUrl} alt={`${b.name} Logo`} className="w-full h-full object-contain" />
                        </div>
                      ) : b.name.toLowerCase().includes("vinfast") ? (
                        <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
                          <img src="/vinfast.png" alt="Vinfast Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : b.name.toLowerCase().includes("yamaha") ? (
                        <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
                          <img src="/yamaha.png" alt="Yamaha Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">
                          <Building2 size={16} />
                        </div>
                      )}
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
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
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
                <label className="text-xs font-semibold text-muted-foreground">Mã cơ sở/chi nhánh</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ví dụ: CN9, HN, SG..."
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

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

              {/* Logo / Avatar Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Logo / Avatar chi nhánh</label>
                <div className="flex items-center gap-4 bg-secondary/10 p-3 rounded-xl border border-border">
                  {formData.logoUrl ? (
                    <div className="relative w-16 h-16 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                      <img src={formData.logoUrl} alt="Preview Logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: "" })}
                        className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-0.5 shadow hover:bg-destructive/80 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/20 hover:border-primary/50 transition-all shrink-0">
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground mt-0.5 font-semibold">Tải lên</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-semibold text-foreground text-[11px]">Chọn hình ảnh làm logo đại diện</p>
                    <p className="text-[10px]">Định dạng: JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                </div>
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
