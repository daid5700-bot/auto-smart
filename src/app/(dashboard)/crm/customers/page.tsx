"use client";
import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Loader2, Search, Filter, Award, CalendarClock, Car, Plus, Edit, Trash2, X } from "lucide-react";
import { useModal } from "@/components/ModalProvider";
import { useAuth } from "@/lib/store";


const SRC: Record<string, string> = {
  FACEBOOK: "Facebook",
  WEBSITE: "Website",
  WALKIN: "Vãng lai",
  REFERRAL: "Giới thiệu",
};

export default function CustomersPage() {
  const modal = useModal();
  const { activeBranch } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "vip" | "service" | "purchase" | "inactive">("all");
  const customerCache = useRef(new Map<string, { customers: any[]; total: number; totalPages: number; page: number }>());
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  // Modal State for CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    source: "WALKIN",
    email: "",
    address: "",
    birthday: "",
    tags: "",
  });

  const fetchData = async (targetPage = 1, append = false) => {
    const branchKey = activeBranch?.id ? String(activeBranch.id) : "all";
    const cacheKey = `${branchKey}:${activeTab}:${searchTerm.trim().toLowerCase()}:${targetPage}`;
    const cached = customerCache.current.get(cacheKey);

    if (cached) {
      activeRequest.current?.abort();
      requestSequence.current += 1;
      setCustomers((prev) => append ? [...prev, ...cached.customers] : cached.customers);
      setTotalCustomers(cached.total);
      setTotalPages(cached.totalPages);
      setPage(cached.page);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (!append) {
      activeRequest.current?.abort();
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    const requestId = ++requestSequence.current;

    try {
      append ? setLoadingMore(true) : setLoading(true);
      const allBranchesQuery = activeTab === "all" ? "&allBranches=true" : "";
      const categoryQuery = activeTab === "all" ? "" : `&category=${activeTab}`;
      const res = await fetch(`/api/crm?tab=customers&page=${targetPage}&limit=20&search=${encodeURIComponent(searchTerm)}${allBranchesQuery}${categoryQuery}`, { signal: controller.signal });
      const data = await res.json();
      if (requestId !== requestSequence.current) return;

      const nextCustomers = data.customers || [];
      const nextTotal = data.pagination?.total || 0;
      const nextTotalPages = data.pagination?.totalPages || 1;
      customerCache.current.set(cacheKey, { customers: nextCustomers, total: nextTotal, totalPages: nextTotalPages, page: targetPage });
      setCustomers((prev) => append ? [...prev, ...nextCustomers] : nextCustomers);
      setTotalCustomers(nextTotal);
      setTotalPages(nextTotalPages);
      setPage(targetPage);
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchData(1, false), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, activeTab, activeBranch?.id]);

  useEffect(() => {
    const onScroll = () => {
      if (loading || loadingMore || page >= totalPages) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320;
      if (nearBottom) fetchData(page + 1, true);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, loadingMore, page, totalPages, searchTerm, activeTab, activeBranch?.id]);

  const handleDeleteCustomer = async (id: number) => {
    const confirmed = await modal.confirm({
      title: "Xác nhận xóa Khách hàng",
      message: "Bạn có chắc chắn muốn xóa Khách hàng này? Việc xóa sẽ giải phóng thông tin xe của họ và dọn dẹp các lịch sử giao dịch liên quan.",
      type: "danger",
      confirmText: "Xóa ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/${id}?type=customer`, { method: "DELETE" });
      if (res.ok) {
        customerCache.current.clear();
        await modal.alert({
          title: "Thành công",
          message: "Đã xóa khách hàng thành công!",
          type: "success",
        });
        await fetchData(1, false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        await modal.alert({
          title: "Thất bại",
          message: errorData.error || "Gặp lỗi khi xóa khách hàng",
          type: "error",
        });
      }
    } catch (e: any) {
      await modal.alert({
        title: "Lỗi kết nối",
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
      phone: "",
      source: "WALKIN",
      email: "",
      address: "",
      birthday: "",
      tags: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      phone: c.phone,
      source: c.source,
      email: c.email || "",
      address: c.address || "",
      birthday: c.birthday ? c.birthday.substring(0, 10) : "",
      tags: c.tags ? c.tags.join(", ") : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/crm/${editingId}` : "/api/crm";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "customer",
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          source: formData.source,
          birthday: formData.birthday || null,
          tags: formData.tags,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        customerCache.current.clear();
        await modal.alert({
          title: "Thành công",
          message: editingId ? "Đã cập nhật thông tin khách hàng thành công!" : "Đã thêm khách hàng mới thành công!",
          type: "success",
        });
        await fetchData(1, false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        await modal.alert({
          title: "Thất bại",
          message: errorData.error || "Gặp lỗi khi lưu thông tin khách hàng",
          type: "error",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Search, category and branch filtering are performed by PostgreSQL before pagination.
  const filteredCustomers = customers;

  return (
    <div className="space-y-6 stagger">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên, số điện thoại, biển số xe hoặc ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-3 flex-nowrap shrink-0">
            <button onClick={handleOpenAdd} className="gradient-success text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all whitespace-nowrap">
              <Plus size={16} /> Thêm Khách hàng
            </button>
            <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm text-muted-foreground whitespace-nowrap">
              <Users size={14} />
              <span>Tổng số: {customers.length} / {totalCustomers}</span>
            </div>
          </div>
        </div>

        {/* Filter categories tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "all" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Filter size={12} />
            Tất cả khách hàng
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "purchase" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20" : "bg-card border border-border text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
            }`}
          >
            <Car size={12} />
            Khách mua xe
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "service" ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "bg-card border border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
            }`}
          >
            <CalendarClock size={12} />
            Khách sử dụng dịch vụ
          </button>
          <button
            onClick={() => setActiveTab("vip")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "vip" ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" : "bg-card border border-border text-amber-600 dark:text-amber-400 hover:bg-amber-50"
            }`}
          >
            <Award size={12} />
            Khách hàng VIP (Chi tiêu lớn)
          </button>
          <button
            onClick={() => setActiveTab("inactive")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "inactive" ? "bg-destructive text-white" : "bg-card border border-border text-destructive hover:bg-destructive/10"
            }`}
          >
            <CalendarClock size={12} />
            Đã lâu chưa quay lại (&gt; 90 ngày)
          </button>
        </div>

      </div>

      <div className="glass-card rounded-xl overflow-hidden relative" aria-busy={loading}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ email</th>
              <th>Biển số xe / Dòng xe</th>
              <th>Điểm tích lũy</th>
              <th>Tổng chi tiêu (VND)</th>
              <th className="w-[100px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c: any) => {
              const isVip = Number(c.totalSpent) >= 20000000 || (c.tags && c.tags.includes("VIP"));
              return (
                <tr key={c.id}>
                  <td className="font-semibold py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-foreground">{c.name}</span>
                        {isVip && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                            VIP
                          </span>
                        )}
                        {(c.tags || []).filter((t: string) => t !== "VIP").map((t: string) => (
                          <span key={t} className="bg-blue-100 text-blue-800 text-[9px] font-semibold px-1 py-0.5 rounded mr-1">
                            {t}
                          </span>
                        ))}
                      </div>
                      {c.birthday && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                          <span>🎂 {formatDate(c.birthday)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.email || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.vehiclePlates && c.vehiclePlates.map((plate: string) => (
                        <span key={plate} className="text-xs bg-secondary/80 px-2 py-0.5 rounded border border-border text-foreground font-mono">
                          {plate}
                        </span>
                      ))}
                      {(!c.vehiclePlates || c.vehiclePlates.length === 0) && <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </td>
                  <td className="font-bold text-amber-600">{c.loyaltyPoints} điểm</td>
                  <td className="font-bold text-primary">{formatCurrency(Number(c.totalSpent))}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEdit(c)} className="p-1 hover:bg-secondary rounded text-primary" title="Sửa thông tin khách hàng"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteCustomer(c.id)} className="p-1 hover:bg-secondary rounded text-destructive" title="Xóa khách hàng"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy khách hàng nào khớp với bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && customers.length > 0 && (
          <div className="absolute inset-0 flex items-start justify-center pt-6 bg-card/20 backdrop-blur-[1px] pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs text-muted-foreground font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Đang cập nhật...
            </div>
          </div>
        )}
      </div>
      {loadingMore && (
        <div className="flex justify-center py-4 text-muted-foreground text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải thêm khách hàng...
        </div>
      )}

      {/* Unified CRM Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">
                {editingId ? "Cập nhật Khách hàng" : "Thêm Khách hàng mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tên khách hàng</label>
                  <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Đặng Văn Hùng" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số điện thoại</label>
                  <input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 0901234567" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nguồn khách hàng</label>
                  <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="FACEBOOK">Facebook</option>
                    <option value="WEBSITE">Website</option>
                    <option value="WALKIN">Vãng lai</option>
                    <option value="REFERRAL">Giới thiệu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: mail@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Ngày sinh</label>
                  <input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                  <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 123 Nguyễn Trãi, Hà Nội" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phân loại / Tags (Phân tách bằng dấu phẩy)</label>
                <input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: VIP, Thân thiết, Gara" />
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
