"use client";
import { useEffect, useState } from "react";
import { Users, Loader2, ShieldAlert, Plus, Edit, Trash2, X, Key } from "lucide-react";
import { roleName, roleColor, UserRole } from "@/config/rbac";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES" as UserRole,
    branchIds: [] as number[],
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBranches();
  }, []);

  const handleDelete = async (id: number, email: string) => {
    if (email === "admin@autosmart.vn") {
      alert("Không thể xóa tài khoản Quản trị viên tối cao (admin@autosmart.vn)!");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${email}" khỏi hệ thống?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi xóa người dùng");
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
      email: "",
      password: "",
      role: "SALES",
      branchIds: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: "", // blank password means no change
      role: u.role as UserRole,
      branchIds: (u.branches || []).map((b: any) => b.id),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/users/${editingId}` : "/api/users";

      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        branchIds: formData.branchIds,
      };
      if (formData.password || !editingId) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi xử lý tài khoản");
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản trị người dùng hệ thống</h2>
          </div>
        <button onClick={handleOpenAdd} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
          <Plus size={16} /> Thêm tài khoản mới
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Địa chỉ Email</th>
              <th>Quyền truy cập (Role)</th>
              <th>Cơ sở phụ trách</th>
              <th>Ngày tạo tài khoản</th>
              <th className="w-[120px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColor(u.role)} flex items-center justify-center text-white text-xs font-bold`}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-semibold">{u.name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge bg-primary/10 text-primary font-bold text-[10px]`}>
                    {roleName(u.role)}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {u.branches && u.branches.length > 0 ? (
                      u.branches.map((b: any) => (
                        <span key={b.id} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                          {b.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Chưa phân cơ sở</span>
                    )}
                  </div>
                </td>
                <td className="text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(u)} className="p-1.5 hover:bg-secondary rounded text-primary" title="Sửa thông tin"><Edit size={14} /></button>
                    {u.email !== "admin@autosmart.vn" && (
                      <button onClick={() => handleDelete(u.id, u.email)} className="p-1.5 hover:bg-secondary rounded text-destructive" title="Xóa tài khoản"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CRUD User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên nhân viên</label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Đỗ Thế Kỷ" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ Email</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: nhanvien@autosmart.vn" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  {editingId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu ban đầu"}
                </label>
                <input type="password" required={!editingId} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder={editingId ? "••••••••" : "Mật khẩu để đăng nhập"} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Quyền hạn truy cập</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="ADMIN">Quản trị viên (Full Access)</option>
                  <option value="WAREHOUSE">Nhân viên Kho phụ tùng</option>
                  <option value="WORKSHOP">Cố vấn / KTV Xưởng dịch vụ</option>
                  <option value="SALES">Nhân viên Kinh doanh xe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Cơ sở phụ trách</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/20 border border-border rounded-xl max-h-32 overflow-y-auto">
                  {branches.map((b: any) => {
                    const checked = formData.branchIds.includes(b.id);
                    return (
                      <label key={b.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, branchIds: [...formData.branchIds, b.id] });
                            } else {
                              setFormData({
                                ...formData,
                                branchIds: formData.branchIds.filter((id) => id !== b.id),
                              });
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary/20 w-3.5 h-3.5"
                        />
                        {b.name}
                      </label>
                    );
                  })}
                  {branches.length === 0 && (
                    <span className="text-muted-foreground italic text-xs col-span-2 text-center py-2">
                      Đang tải danh sách cơ sở...
                    </span>
                  )}
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
