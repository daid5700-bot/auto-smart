"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Loader2, Search, Filter, Award, CalendarClock, Car, Plus, Edit, Trash2, X } from "lucide-react";

const SRC: Record<string, string> = {
  FACEBOOK: "Facebook",
  WEBSITE: "Website",
  WALKIN: "Vãng lai",
  REFERRAL: "Giới thiệu",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "vip" | "inactive" | "camry" | "bmw" | "vios">("all");

  // Modal State for CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    source: "WALKIN",
    email: "",
    address: "",
    tags: "",
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/crm?tab=customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Khách hàng này? Việc xóa sẽ giải phóng thông tin xe của họ và dọn dẹp các lịch sử giao dịch liên quan.")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/${id}?type=customer`, { method: "DELETE" });
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
    setFormData({
      name: "",
      phone: "",
      source: "WALKIN",
      email: "",
      address: "",
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
          tags: formData.tags,
        }),
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

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Filter logic
  const filteredCustomers = customers.filter((c) => {
    // Search filter
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.vehiclePlates && c.vehiclePlates.some((plate: string) => plate.toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === "vip") {
      return Number(c.totalSpent) >= 20000000 || (c.tags && c.tags.includes("VIP"));
    }
    if (activeTab === "inactive") {
      if (!c.lastVisit) return true;
      const diffTime = Math.abs(new Date().getTime() - new Date(c.lastVisit).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 90;
    }
    if (activeTab === "camry") {
      return c.vehiclePlates && c.vehiclePlates.some((plate: string) => plate.toLowerCase().includes("camry") || c.name.toLowerCase().includes("camry"));
    }
    if (activeTab === "bmw") {
      return c.vehiclePlates && c.vehiclePlates.some((plate: string) => plate.toLowerCase().includes("bmw"));
    }
    if (activeTab === "vios") {
      return c.vehiclePlates && c.vehiclePlates.some((plate: string) => plate.toLowerCase().includes("vios"));
    }

    return true;
  });

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Danh sách khách hàng</h2>
          <p className="text-muted-foreground text-sm mt-1">Quản lý tệp khách hàng chính thức sở hữu ô tô hoặc đã sử dụng dịch vụ tại garage</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenAdd} className="gradient-success text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit">
            <Plus size={16} /> Thêm Khách hàng
          </button>
          <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm text-muted-foreground">
            <Users size={14} />
            <span>Tổng số: {filteredCustomers.length} / {customers.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, số điện thoại, biển số xe..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
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
          <button
            onClick={() => setActiveTab("camry")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "camry" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Car size={12} />
            Sở hữu Camry
          </button>
          <button
            onClick={() => setActiveTab("bmw")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "bmw" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Car size={12} />
            Sở hữu BMW
          </button>
          <button
            onClick={() => setActiveTab("vios")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "vios" ? "bg-blue-600 text-white" : "bg-card border border-border text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Car size={12} />
            Sở hữu Vios
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ email</th>
              <th>Biển số xe / Dòng xe</th>
              <th>Lần ghé cuối</th>
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
                  <td className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span>{c.name}</span>
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
                  <td className="text-xs text-muted-foreground">
                    {c.lastVisit ? formatDate(c.lastVisit) : "Chưa ghé thăm"}
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
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy khách hàng nào khớp với bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội" />
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
