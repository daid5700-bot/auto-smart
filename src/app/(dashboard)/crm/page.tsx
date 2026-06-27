"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate, statusText, statusBadge } from "@/lib/utils";
import { Users, UserPlus, MessageSquare, Loader2, Edit, Trash2, X } from "lucide-react";

const SRC: Record<string, string> = { FACEBOOK: "Facebook", WEBSITE: "Website", WALKIN: "Vãng lai", REFERRAL: "Giới thiệu" };
const ZNS_TYPE: Record<string, string> = { THANK_YOU: "Cảm ơn", BIRTHDAY: "Sinh nhật", MAINTENANCE: "Nhắc bảo dưỡng", PROMOTION: "Khuyến mãi" };
const LEAD_COLS = [
  { status: "NEW", label: "Mới", border: "border-t-blue-500/50" },
  { status: "CONSULTING", label: "Đang tư vấn", border: "border-t-amber-500/50" },
  { status: "POTENTIAL", label: "Tiềm năng", border: "border-t-purple-500/50" },
  { status: "CONVERTED", label: "Đã mua", border: "border-t-emerald-500/50" },
];

export default function CRMPage() {
  const [tab, setTab] = useState<"leads" | "customers" | "zns">("leads");
  const [stats, setStats] = useState<any>(null);
  const [tabData, setTabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leadPagination, setLeadPagination] = useState<any>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: "lead", // "lead" | "customer"
    name: "",
    phone: "",
    source: "WALKIN",
    interest: "",
    status: "NEW",
    email: "",
    address: "",
    tags: "",
  });

  const fetchStats = () => {
    fetch("/api/crm?tab=stats").then((r) => r.json()).then(setStats);
  };

  const fetchTabData = () => {
    setLoading(true);
    // FIX #8: Use limit=100 and track pagination for lead pipeline overflow
    fetch(`/api/crm?tab=${tab}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setTabData(data);
        if (data.pagination) setLeadPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTabData(); }, [tab]);

  const handleDeleteLead = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Lead này?")) return;
    try {
      const res = await fetch(`/api/crm/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTabData();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa Khách hàng này? Việc xóa sẽ giải phóng thông tin xe của họ và dọn dẹp các lịch sử giao dịch liên quan.")) return;
    try {
      const res = await fetch(`/api/crm/${id}?type=customer`, { method: "DELETE" });
      if (res.ok) {
        fetchTabData();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = (type: "lead" | "customer" = "lead") => {
    setEditingId(null);
    setFormData({
      type,
      name: "",
      phone: "",
      source: "WALKIN",
      interest: "",
      status: "NEW",
      email: "",
      address: "",
      tags: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any, type: "lead" | "customer") => {
    setEditingId(item.id);
    setFormData({
      type,
      name: item.name,
      phone: item.phone,
      source: item.source,
      interest: item.interest || "",
      status: item.status || "NEW",
      email: item.email || "",
      address: item.address || "",
      tags: item.tags ? item.tags.join(", ") : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isCustomer = formData.type === "customer";
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/crm/${editingId}` : "/api/crm";

      const payload = isCustomer ? {
        type: "customer",
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        source: formData.source,
        tags: formData.tags,
      } : {
        type: "lead",
        name: formData.name,
        phone: formData.phone,
        source: formData.source,
        interest: formData.interest,
        status: formData.status,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchTabData();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Chăm sóc khách hàng</h2></div>
        <div className="flex gap-2">
          {tab === "leads" && (
            <button onClick={() => handleOpenAdd("lead")} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><UserPlus size={16} />Thêm Lead</button>
          )}
          {tab === "customers" && (
            <button onClick={() => handleOpenAdd("customer")} className="gradient-success text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit"><UserPlus size={16} />Thêm Khách hàng</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Tổng Lead</p><p className="text-2xl font-bold">{stats?.leadCount || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Khách hàng</p><p className="text-2xl font-bold">{stats?.customerCount || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">ZNS đã gửi</p><p className="text-2xl font-bold text-info">{stats?.znsCount || 0}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs text-muted-foreground">Tỉ lệ chuyển đổi</p><p className="text-2xl font-bold text-success">{stats?.conversionRate || 0}%</p></div>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        {([["leads", "Lead Pipeline", Users], ["customers", "Khách hàng", Users], ["zns", "Zalo ZNS", MessageSquare]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${tab === k ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}><I size={14} />{l}</button>
        ))}
      </div>

      {loading ? <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : <>
        {/* FIX #8: Lead overflow warning banner */}
        {tab === "leads" && leadPagination && leadPagination.total > leadPagination.limit && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
            ⚠️ Đang hiển thị {leadPagination.limit} / <strong>{leadPagination.total}</strong> leads. Hệ thống giới hạn {leadPagination.limit} leads mỗi trang để đảm bảo hiệu năng.
          </div>
        )}

        {tab === "leads" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {LEAD_COLS.map((col) => {
              const items = (tabData?.leads || []).filter((l: any) => l.status === col.status);
              return (
                <div key={col.status} className={`kanban-column p-3 border-t-2 ${col.border}`}>
                  <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-muted-foreground uppercase">{col.label}</h3><span className="badge badge-primary text-[10px]">{items.length}</span></div>
                  <div className="space-y-2">
                    {items.map((l: any) => (
                      <div key={l.id} className="kanban-card group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] font-bold">{l.name?.charAt(0)}</div>
                            <div className="min-w-0"><p className="text-sm font-medium truncate">{l.name}</p><p className="text-[10px] text-muted-foreground">{l.phone}</p></div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(l, "lead")} className="p-1 text-primary hover:bg-secondary rounded"><Edit size={12} /></button>
                            <button onClick={() => handleDeleteLead(l.id)} className="p-1 text-destructive hover:bg-secondary rounded"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{l.interest}</p>
                        <div className="flex items-center justify-between"><span className="badge badge-info text-[10px]">{SRC[l.source] || l.source}</span><span className="text-[10px] text-muted-foreground">{formatDate(l.createdAt)}</span></div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 opacity-40">Trống</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "customers" && (
          <div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Nguồn</th><th>Biển số</th><th>Chi tiêu</th><th>Điểm</th><th>Lần cuối</th><th className="w-[100px]">Thao tác</th></tr></thead>
            <tbody>{(tabData?.customers || []).map((c: any) => (
              <tr key={c.id}>
                <td><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center text-white text-xs font-bold">{c.name?.charAt(0)}</div><div><p className="font-medium">{c.name}</p>{(c.tags || []).map((t: string) => <span key={t} className="badge badge-warning text-[10px] mr-1">{t}</span>)}</div></div></td>
                <td>{c.phone}</td><td><span className="badge badge-info text-[10px]">{SRC[c.source] || c.source}</span></td><td className="text-muted-foreground">{(c.vehiclePlates || []).join(", ")}</td>
                <td className="font-semibold">{formatCurrency(Number(c.totalSpent))}</td><td><span className="badge badge-success">{c.loyaltyPoints} pts</span></td><td className="text-muted-foreground">{c.lastVisit ? formatDate(c.lastVisit) : "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(c, "customer")} className="p-1 text-primary hover:bg-secondary rounded" title="Sửa thông tin khách hàng"><Edit size={14} /></button>
                    <button onClick={() => handleDeleteCustomer(c.id)} className="p-1 text-destructive hover:bg-secondary rounded" title="Xóa khách hàng"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}

        {tab === "zns" && (
          <div className="glass-card rounded-xl overflow-hidden"><table className="data-table">
            <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Loại tin</th><th>Nội dung</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
            <tbody>{(tabData?.znsLogs || []).map((z: any) => (
              <tr key={z.id}>
                <td className="font-medium">{z.customer?.name}</td><td>{z.phone}</td>
                <td><span className="badge badge-purple text-[10px]">{ZNS_TYPE[z.messageType] || z.messageType}</span></td>
                <td className="max-w-xs"><p className="text-sm text-muted-foreground truncate">{z.content}</p></td>
                <td><span className={`badge ${statusBadge(z.status)}`}>{statusText(z.status)}</span>{z.error && <p className="text-[10px] text-destructive mt-1">{z.error}</p>}</td>
                <td className="text-muted-foreground text-xs">{formatDate(z.sentAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </>}

      {/* Unified CRM Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">
                {editingId 
                  ? (formData.type === "customer" ? "Cập nhật Khách hàng" : "Cập nhật Lead") 
                  : (formData.type === "customer" ? "Thêm Khách hàng mới" : "Thêm Lead mới")}
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
                
                {formData.type === "lead" ? (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái chăm sóc</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="NEW">Mới tiếp nhận (New)</option>
                      <option value="CONSULTING">Đang tư vấn (Consulting)</option>
                      <option value="POTENTIAL">Tiềm năng (Potential)</option>
                      <option value="CONVERTED">Đã chốt mua (Converted)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: mail@example.com" />
                  </div>
                )}
              </div>

              {formData.type === "lead" ? (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Nhu cầu quan tâm</label>
                  <textarea required value={formData.interest} onChange={(e) => setFormData({ ...formData, interest: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="VD: Quan tâm Toyota Camry 2.5Q 2026, cần tư vấn trả góp..." />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Địa chỉ</label>
                    <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Phân loại / Tags (Phân tách bằng dấu phẩy)</label>
                    <input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: VIP, Thân thiết, Gara" />
                  </div>
                </>
              )}

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
