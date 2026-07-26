"use client";
import { useEffect, useState } from "react";
import { Users, Loader2, ShieldAlert, Plus, Edit, Trash2, X, Key } from "lucide-react";
import { roleName, roleColor, UserRole } from "@/config/rbac";
import { useModal } from "@/components/ModalProvider";
import { ModalPortal } from "@/components/modal-portal";
import { CustomSelect } from "@/components/CustomSelect";


export default function UsersPage() {
  const modal = useModal();
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
      await modal.alert({
        title: "Không được phép",
        message: "Không thể xóa tài khoản Quản trị viên tối cao (admin@autosmart.vn)!",
        type: "error",
      });
      return;
    }
    const confirmed = await modal.confirm({
      title: "Xác nhận xóa tài khoản",
      message: `Bạn có chắc chắn muốn xóa nhân viên "${email}" khỏi hệ thống không?`,
      type: "danger",
      confirmText: "Xóa ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi xóa người dùng");
      }
      await modal.alert({
        title: "Đã xóa",
        message: `Đã xóa tài khoản ${email} thành công!`,
        type: "success",
      });
      await fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Lỗi",
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
      await modal.alert({
        title: "Thành công",
        message: editingId ? "Cập nhật tài khoản nhân viên thành công!" : "Tạo tài khoản nhân viên mới thành công!",
        type: "success",
      });
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
                        <span key={b.id} className="px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-bold border border-border whitespace-nowrap">
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
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-card border border-border/80 rounded-3xl overflow-hidden shadow-2xl animate-slide-in-bottom">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {editingId ? "Cập nhật tài khoản nhân viên" : "Tạo tài khoản nhân viên mới"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {editingId ? "Phân quyền truy cập và gán chi nhánh hoạt động" : "Nhập đầy đủ thông tin tài khoản và chi nhánh quản lý"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Họ và tên nhân viên <span className="text-destructive">*</span></label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: Đỗ Thế Kỷ" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Địa chỉ Email <span className="text-destructive">*</span></label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: nhanvien@autosmart.vn" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {editingId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu ban đầu *"}
                  </label>
                  <input type="password" required={!editingId} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder={editingId ? "••••••••" : "Nhập mật khẩu để đăng nhập"} />
                </div>

                <div className="pt-2 border-t border-border/40">
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Quyền hạn truy cập <span className="text-destructive">*</span></label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val as UserRole })}
                    options={[
                      { value: "ADMIN", label: "Quản trị viên (Full Access)", badge: "Admin", badgeVariant: "danger" },
                      { value: "WAREHOUSE", label: "Nhân viên Kho phụ tùng", badge: "Kho", badgeVariant: "warning" },
                      { value: "WORKSHOP", label: "Cố vấn / KTV Xưởng dịch vụ", badge: "Xưởng", badgeVariant: "info" },
                      { value: "SALES", label: "Nhân viên Kinh doanh xe", badge: "Kinh doanh", badgeVariant: "success" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Cơ sở phụ trách</label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/20 border border-border rounded-xl max-h-36 overflow-y-auto">
                    {branches.map((b: any) => {
                      const checked = formData.branchIds.includes(b.id);
                      return (
                        <label key={b.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none p-1.5 hover:bg-secondary/40 rounded-lg transition-colors">
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
                            className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
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

                <div className="flex gap-3 justify-end pt-3 border-t border-border/80">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-secondary/60 transition-all">Hủy bỏ</button>
                  <button type="submit" className="gradient-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20">Lưu thông tin</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
