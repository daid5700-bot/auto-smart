"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { 
  MessageSquare, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Plus, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  X,
  FileText,
  Save,
  Check
} from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    id: "CRM_THANK_YOU_001",
    name: "Cảm ơn sau sửa chữa",
    description: "Gửi ngay khi đóng lệnh sửa chữa",
    content: "Cảm ơn anh/chị {{customerName}} đã tin tưởng dịch vụ. Xe {{vehiclePlate}} đã được bàn giao. Tổng chi phí: {{finalTotal}}. Điểm tích lũy: +{{points}}",
    status: "ACTIVE",
    category: "THANK_YOU"
  },
  {
    id: "CRM_OIL_REMIND_002",
    name: "Nhắc thay dầu & bảo dưỡng",
    description: "Nhắc KH đến hạn thay dầu & bảo dưỡng định kỳ",
    content: "Đã đến hạn bảo dưỡng xe! Chào anh/chị {{customerName}}. Đã 3 tháng kể từ lần chăm sóc xe gần nhất (ngày {{orderDate}}), chiếc {{vehicleName}} biển số {{vehiclePlate}} của anh/chị đã đến định kỳ thay dầu máy và bảo dưỡng các hạng mục tiêu hao. Để xe luôn vận hành êm ái và tiết kiệm xăng, mời anh/chị mang xe qua xưởng dịch vụ {{storeName}} để đội ngũ Kỹ thuật viên kiểm tra tổng thể miễn phí 100%.",
    status: "ACTIVE",
    category: "MAINTENANCE"
  },
  {
    id: "CRM_BIRTHDAY_003",
    name: "Chúc mừng sinh nhật",
    description: "Tặng voucher sinh nhật",
    content: "Chúc Mừng Sinh Nhật Quý Khách {{customerName}}. Nhân dịp sinh nhật, Yamaha Town Toàn Thắng kính chúc quý khách {{customerName}} (SĐT: {{customerPhone}}) một tuổi mới thật nhiều sức khỏe, hạnh phúc và vạn sự hanh thông! QUÀ TẶNG ĐẶC QUYỀN TRONG TUẦN SINH NHẬT: Nhận ngay quà tặng đặc quyền tại xưởng dịch vụ. Hạn đến ngày {{expiryDate}}",
    status: "ACTIVE",
    category: "BIRTHDAY"
  },
  {
    id: "CRM_INSPECT_004",
    name: "Nhắc kiểm tra định kỳ",
    description: "Nhắc lịch kiểm tra tổng quát 6 tháng",
    content: "Anh/chị {{customerName}} ơi, đã 6 tháng từ lần kiểm tra gần nhất. Hẹn anh/chị ghé garage để kiểm tra miễn phí!",
    status: "INACTIVE",
    category: "MAINTENANCE"
  }
];

export default function ZnsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State: "logs" or "templates"
  const [activeTab, setActiveTab] = useState<"logs" | "templates">("logs");
  
  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Search queries
  const [logsSearch, setLogsSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Form states
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("MAINTENANCE");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/crm?tab=zns");
      const data = await res.json();
      setLogs(data.znsLogs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Load Templates
    const saved = localStorage.getItem("zns_templates_v2");
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      localStorage.setItem("zns_templates_v2", JSON.stringify(DEFAULT_TEMPLATES));
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.removeItem("zns_templates"); // Clean up old version
    }
  }, []);

  const saveTemplatesToStorage = (updatedList: any[]) => {
    setTemplates(updatedList);
    localStorage.setItem("zns_templates_v2", JSON.stringify(updatedList));
  };

  const znsLabel = (type: string) => {
    switch (type) {
      case "WELCOME": return "Chào mừng thành viên";
      case "THANK_YOU": return "Cảm ơn sau dịch vụ";
      case "OIL_CHANGE": return "Nhắc thay dầu nhớt";
      case "GENERAL_INSPECT": return "Kiểm tra định kỳ";
      case "BRAKE_CHANGE": return "Thay má phanh";
      case "PROMO": return "Chương trình khuyến mãi";
      case "MAINTENANCE": return "Nhắc bảo dưỡng";
      case "BIRTHDAY": return "Chúc mừng sinh nhật";
      default: return type;
    }
  };

  // Toggle Template Status
  const handleToggleStatus = (id: string) => {
    const updated = templates.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
  };

  // Start Edit Template
  const handleStartEdit = (template: any) => {
    setSelectedTemplate(template);
    setFormId(template.id);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormContent(template.content);
    setFormCategory(template.category || "MAINTENANCE");
    setEditModalOpen(true);
  };

  // Save Edited Template
  const handleSaveEdit = () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplate.id) {
        return {
          ...t,
          name: formName,
          description: formDescription,
          content: formContent,
          category: formCategory
        };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
    setEditModalOpen(false);
    setSelectedTemplate(null);
  };

  // Create Template
  const handleCreateTemplate = () => {
    if (!formId.trim() || !formName.trim() || !formContent.trim()) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }
    
    // Check if ID is unique
    if (templates.some(t => t.id === formId.trim())) {
      alert("Mã mẫu tin nhắn này đã tồn tại!");
      return;
    }

    const newTemplate = {
      id: formId.trim(),
      name: formName.trim(),
      description: formDescription.trim(),
      content: formContent.trim(),
      status: "ACTIVE",
      category: formCategory
    };

    saveTemplatesToStorage([...templates, newTemplate]);
    setCreateModalOpen(false);
    
    // Reset Form
    setFormId("");
    setFormName("");
    setFormDescription("");
    setFormContent("");
    setFormCategory("MAINTENANCE");
  };

  const renderStatus = (status: string, error?: string) => {
    switch (status) {
      case "SENT":
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
            <CheckCircle2 size={12} /> Thành công
          </span>
        );
      case "FAILED":
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
              <AlertCircle size={12} /> Thất bại
            </span>
            {error && <p className="text-[10px] text-destructive leading-tight font-medium max-w-[160px]">{error}</p>}
          </div>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={12} /> Đang gửi
          </span>
        );
    }
  };

  // Filter logs & templates
  const filteredLogs = logs.filter(l => 
    l.customer?.name.toLowerCase().includes(logsSearch.toLowerCase()) ||
    l.phone.includes(logsSearch) ||
    l.content.toLowerCase().includes(logsSearch.toLowerCase()) ||
    znsLabel(l.messageType).toLowerCase().includes(logsSearch.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.id.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.content.toLowerCase().includes(templateSearch.toLowerCase())
  );

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Zalo ZNS</h2>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            activeTab === "logs"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lịch sử gửi ZNS
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            activeTab === "templates"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mẫu tin ZNS
        </button>
      </div>

      {/* ZNS Logs Tab Content */}
      {activeTab === "logs" && (
        <div className="space-y-4 animate-fade-in">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="Tìm theo tên khách hàng, số điện thoại, nội dung tin nhắn..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-border shadow-xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[15%]">Thời gian</th>
                  <th className="w-[20%]">Khách hàng nhận</th>
                  <th className="w-[15%]">Số điện thoại</th>
                  <th className="w-[15%]">Loại tin nhắn</th>
                  <th className="w-[25%]">Nội dung gửi</th>
                  <th className="w-[10%]">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="text-muted-foreground text-xs">{formatDate(l.sentAt)}</td>
                    <td className="font-semibold text-foreground">{l.customer?.name}</td>
                    <td className="font-medium text-xs">{l.phone}</td>
                    <td>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                        {znsLabel(l.messageType)}
                      </span>
                    </td>
                    <td className="max-w-xs truncate font-medium text-xs text-muted-foreground" title={l.content}>
                      {l.content}
                    </td>
                    <td>{renderStatus(l.status, l.error)}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground font-semibold text-xs">
                      Không tìm thấy lịch sử tin nhắn phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ZNS Templates Tab Content */}
      {activeTab === "templates" && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Tìm mẫu tin theo tên, mã hoặc nội dung..."
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => {
                setFormId("");
                setFormName("");
                setFormDescription("");
                setFormContent("");
                setFormCategory("MAINTENANCE");
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 gradient-primary hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/15 whitespace-nowrap"
            >
              <Plus size={14} /> Tạo mẫu mới
            </button>
          </div>

          <div className="p-4 bg-secondary/35 border border-border rounded-2xl text-[11px] font-semibold text-muted-foreground flex items-start gap-2 leading-relaxed">
            <FileText size={14} className="text-primary shrink-0 mt-0.5" />
            <span>
              Cấu hình các mẫu tin nhắn Zalo ZNS. Dùng các biến trong ngoặc nhọn để cá nhân hoá nội dung:{" "}
              <code className="text-primary font-bold">{"{{customerName}}"}</code>,{" "}
              <code className="text-primary font-bold">{"{{vehiclePlate}}"}</code>,{" "}
              <code className="text-primary font-bold">{"{{nextService}}"}</code>,{" "}
              <code className="text-primary font-bold">{"{{finalTotal}}"}</code>,{" "}
              <code className="text-primary font-bold">{"{{points}}"}</code>...
            </span>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-start gap-2 leading-relaxed">
            ⚠️ <span>Mẫu tin ZNS hiện đang lưu trên <strong>trình duyệt cục bộ (localStorage)</strong>. Mỗi máy tính / nhân viên sẽ thấy mẫu tin <em>khác nhau</em>. Xóa cache trình duyệt sẽ làm mất mẫu. Khuyến nghị đồng bộ mẫu tin lên cơ sở dữ liệu trong phiên bản tiếp theo.</span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTemplates.map((t) => (
              <div 
                key={t.id} 
                className={`glass-card rounded-2xl border p-5 shadow-lg flex flex-col justify-between transition-all ${
                  t.status === "ACTIVE" 
                    ? "border-border hover:shadow-xl bg-card" 
                    : "border-border/60 bg-secondary/15 opacity-70"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="space-y-0.5">
                      <span className="font-mono text-[9px] text-muted-foreground font-bold tracking-wider uppercase bg-secondary px-2 py-0.5 rounded">
                        {t.id}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">{t.name}</h3>
                      {t.description && <p className="text-[10px] text-muted-foreground font-medium">{t.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                      t.status === "ACTIVE" 
                        ? "bg-success/15 text-success border border-success/20" 
                        : "bg-neutral-500/15 text-muted-foreground border border-neutral-500/10"
                    }`}>
                      {t.status === "ACTIVE" ? "ACTIVE" : "TẮT"}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 bg-secondary/30 dark:bg-black/20 border border-border/60 rounded-xl mb-4">
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                      "{t.content}"
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleToggleStatus(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      t.status === "ACTIVE"
                        ? "bg-neutral-500/10 text-muted-foreground hover:bg-neutral-500/20"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {t.status === "ACTIVE" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {t.status === "ACTIVE" ? "Tắt" : "Bật"}
                  </button>
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Edit3 size={12} /> Sửa
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-medium text-xs">
              Chưa cấu hình mẫu tin nhắn ZNS nào
            </div>
          )}
        </div>
      )}

      {/* Edit Template Modal */}
      {editModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-bottom">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border bg-secondary/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <Edit3 size={16} />
                <h3 className="font-bold text-sm uppercase">Cập nhật mẫu tin ZNS</h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Mã mẫu (Template Code)</label>
                <input
                  type="text"
                  disabled
                  value={formId}
                  className="w-full px-3 py-2 bg-secondary/20 border border-border rounded-xl text-xs outline-none opacity-60 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Tên mẫu tin nhắn</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Loại tin nhắn</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
                >
                  <option value="MAINTENANCE">Nhắc lịch bảo dưỡng</option>
                  <option value="THANK_YOU">Cảm ơn khách hàng</option>
                  <option value="BIRTHDAY">Chúc mừng sinh nhật</option>
                  <option value="PROMO">Khuyến mãi / Sự kiện</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Nội dung tin nhắn</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium leading-relaxed text-foreground"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 bg-secondary/10 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-border text-xs rounded-xl hover:bg-secondary/40 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 gradient-primary text-white text-xs font-bold rounded-xl hover:opacity-90 flex items-center gap-1.5 transition-all shadow-md shadow-primary/10"
              >
                <Save size={12} /> Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-bottom">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border bg-secondary/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <Plus size={16} />
                <h3 className="font-bold text-sm uppercase">Thêm mẫu tin ZNS mới</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Mã mẫu (ví dụ: CRM_PROMO_005)</label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="CRM_TEMPLATE_CODE"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Tên mẫu tin nhắn</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Mẫu nhắc bảo dưỡng định kỳ"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Loại tin nhắn</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
                >
                  <option value="MAINTENANCE">Nhắc lịch bảo dưỡng</option>
                  <option value="THANK_YOU">Cảm ơn khách hàng</option>
                  <option value="BIRTHDAY">Chúc mừng sinh nhật</option>
                  <option value="PROMO">Khuyến mãi / Sự kiện</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả khi nào sử dụng mẫu này"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Nội dung tin nhắn</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Sử dụng {{customerName}}, {{vehiclePlate}}..."
                  rows={4}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium leading-relaxed text-foreground"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 bg-secondary/10 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 border border-border text-xs rounded-xl hover:bg-secondary/40 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-5 py-2 gradient-primary text-white text-xs font-bold rounded-xl hover:opacity-90 flex items-center gap-1.5 transition-all shadow-md shadow-primary/10"
              >
                <Check size={12} /> Thêm mẫu tin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
