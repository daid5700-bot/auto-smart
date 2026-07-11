"use client";

import { useEffect, useState } from "react";
import { formatDate, formatCurrency, parseSymptoms } from "@/lib/utils";
import { 
  Bell, 
  Loader2, 
  Send, 
  CheckCircle2, 
  Search, 
  AlertTriangle, 
  Clock, 
  Calendar,
  X,
  Sparkles,
  MessageSquare,
  Info
} from "lucide-react";
import { sendCustomZnsAction } from "@/app/actions";
import { useModal } from "@/components/ModalProvider";


const DEFAULT_TEMPLATES = [
  {
    id: "CRM_THANK_YOU_001",
    name: "Cảm ơn khách hàng",
    content: "Cảm ơn anh/chị {{customerName}} đã tin tưởng dịch vụ. Xe {{vehiclePlate}} đã được bàn giao. Tổng chi phí: {{finalTotal}}. Điểm tích lũy: +{{points}}",
    status: "ACTIVE",
    category: "THANK_YOU"
  },
  {
    id: "CRM_OIL_REMIND_002",
    name: "Nhắc thay dầu & bảo dưỡng",
    content: "Đã đến hạn bảo dưỡng xe! Chào anh/chị {{customerName}}. Đã 3 tháng kể từ lần chăm sóc xe gần nhất (ngày {{orderDate}}), chiếc {{vehicleName}} biển số {{vehiclePlate}} của anh/chị đã đến định kỳ thay dầu máy và bảo dưỡng các hạng mục tiêu hao. Để xe luôn vận hành êm ái và tiết kiệm xăng, mời anh/chị mang xe qua xưởng dịch vụ {{storeName}} để đội ngũ Kỹ thuật viên kiểm tra tổng thể miễn phí 100%.",
    status: "ACTIVE",
    category: "MAINTENANCE"
  },
  {
    id: "CRM_BIRTHDAY_003",
    name: "Chúc mừng sinh nhật",
    content: "Chúc Mừng Sinh Nhật Quý Khách {{customerName}}. Nhân dịp sinh nhật, Yamaha Town Toàn Thắng kính chúc quý khách {{customerName}} (SĐT: {{customerPhone}}) một tuổi mới thật nhiều sức khỏe, hạnh phúc và vạn sự hanh thông! QUÀ TẶNG ĐẶC QUYỀN TRONG TUẦN SINH NHẬT: Nhận ngay quà tặng đặc quyền tại xưởng dịch vụ. Hạn đến ngày {{expiryDate}}",
    status: "ACTIVE",
    category: "BIRTHDAY"
  }
];

interface ReminderItem {
  id: string; // customerId + '-' + type
  customer: any;
  plate: string;
  serviceType: "VEHICLE_PURCHASE" | "REPAIR_SERVICE";
  serviceLabel: string;
  dueDate: Date;
  daysRemaining: number;
  isOverdue: boolean;
  isUpcoming: boolean; // <= 14 days
  isFarther: boolean; // > 14 days
  isReminded: boolean;
}

export default function RemindersPage() {
  const modal = useModal();
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overdue" | "upcoming" | "farther" | "reminded">("overdue");

  // ZNS Send Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [compiledContent, setCompiledContent] = useState("");
  const [sendingZns, setSendingZns] = useState(false);

  // History Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyReminder, setHistoryReminder] = useState<ReminderItem | null>(null);

  const handleOpenHistoryModal = (reminder: ReminderItem) => {
    setHistoryReminder(reminder);
    setHistoryModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/crm?tab=reminders");
      const data = await res.json();
      const parsedReminders = (data.reminders || []).map((r: any) => ({
        ...r,
        dueDate: new Date(r.dueDate)
      }));
      setReminders(parsedReminders);
    } catch (e) {
      console.error("Error fetching reminders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Load ZNS templates
    const saved = localStorage.getItem("zns_templates_v2");
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      localStorage.setItem("zns_templates_v2", JSON.stringify(DEFAULT_TEMPLATES));
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.removeItem("zns_templates"); // Clean up old version
    }
  }, []);

  // Filter based on search query
  const filteredReminders = reminders.filter(item => 
    item.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customer.phone.includes(searchQuery) ||
    item.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serviceLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const overdueCount = filteredReminders.filter(item => item.isOverdue && !item.isReminded).length;
  const upcomingCount = filteredReminders.filter(item => item.isUpcoming && !item.isReminded).length;
  const fartherCount = filteredReminders.filter(item => item.isFarther && !item.isReminded).length;
  const remindedCount = filteredReminders.filter(item => item.isReminded).length;

  // Groups
  const overdueItems = filteredReminders.filter(item => item.isOverdue && !item.isReminded);
  const upcomingItems = filteredReminders.filter(item => item.isUpcoming && !item.isReminded);
  const fartherItems = filteredReminders.filter(item => item.isFarther && !item.isReminded);
  const remindedItems = filteredReminders.filter(item => item.isReminded);

  // ZNS variables compilation helper
  const handleOpenZnsModal = (reminder: ReminderItem) => {
    setSelectedReminder(reminder);
    
    // Choose initial active template or default
    const activeTemplates = templates.filter(t => t.status === "ACTIVE");
    let initialTemplate = activeTemplates.find(t => t.category === "MAINTENANCE") || activeTemplates[0] || templates[0];
    
    if (initialTemplate) {
      setSelectedTemplateId(initialTemplate.id);
      compileContent(initialTemplate.content, reminder);
    } else {
      setSelectedTemplateId("");
      setCompiledContent("");
    }
    setModalOpen(true);
  };

  const compileContent = (templateText: string, reminder: ReminderItem) => {
    const pointsStr = String(reminder.customer.loyaltyPoints || 0);
    const finalTotalStr = formatCurrency(Number(reminder.customer.totalSpent || 0));
    const nextServiceText = `${reminder.serviceLabel} (${formatDate(reminder.dueDate.toISOString())})`;

    // Lấy ngày dịch vụ lần trước từ lastRepairOrder
    const lastRo = reminder.customer.lastRepairOrder;
    const orderDateStr = lastRo?.createdAt
      ? formatDate(lastRo.createdAt)
      : formatDate(new Date(reminder.dueDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()); // fallback: dueDate - 3 tháng

    // Tên xe từ lastRepairOrder hoặc lastVehicle
    const vehicleName =
      lastRo?.vehicleModel ||
      (reminder.customer.lastVehicle
        ? `${reminder.customer.lastVehicle.model}${reminder.customer.lastVehicle.variant ? " " + reminder.customer.lastVehicle.variant : ""}`
        : "xe máy");

    // Tên chi nhánh
    const storeName = reminder.customer.branch?.name || "Yamaha Town Toàn Thắng";

    const result = templateText
      // Double-brace style: {{variableName}}
      .replace(/\{\{customerName\}\}/g, reminder.customer.name)
      .replace(/\{\{customer_name\}\}/g, reminder.customer.name)
      .replace(/\{\{vehiclePlate\}\}/g, reminder.plate)
      .replace(/\{\{license_plate\}\}/g, reminder.plate)
      .replace(/\{\{vehicleName\}\}/g, vehicleName)
      .replace(/\{\{vehicle_name\}\}/g, vehicleName)
      .replace(/\{\{orderDate\}\}/g, orderDateStr)
      .replace(/\{\{order_date\}\}/g, orderDateStr)
      .replace(/\{\{storeName\}\}/g, storeName)
      .replace(/\{\{store_name\}\}/g, storeName)
      .replace(/\{\{nextService\}\}/g, nextServiceText)
      .replace(/\{\{finalTotal\}\}/g, finalTotalStr)
      .replace(/\{\{points\}\}/g, pointsStr)
      // Zalo angle-bracket style: <variable_name>
      .replace(/<customer_name>/g, reminder.customer.name)
      .replace(/<license_plate>/g, reminder.plate)
      .replace(/<vehicle_name>/g, vehicleName)
      .replace(/<order_date>/g, orderDateStr)
      .replace(/<store_name>/g, storeName);

    setCompiledContent(result);
  };


  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && selectedReminder) {
      compileContent(template.content, selectedReminder);
    }
  };

  const handleSendZns = async () => {
    if (!selectedReminder) return;
    try {
      setSendingZns(true);
      const res = await sendCustomZnsAction({
        customerId: selectedReminder.customer.id,
        phone: selectedReminder.customer.phone,
        messageType: selectedReminder.serviceType,
        templateId: selectedTemplateId,
        content: compiledContent
      });

      if (res.success) {
        setModalOpen(false);
        await modal.alert({
          title: "Thành công",
          message: "Gửi tin nhắn ZNS thành công!",
          type: "success",
        });
        fetchData();
      } else {
        await modal.alert({
          title: "Thất bại",
          message: "Lỗi khi gửi tin ZNS: " + res.error,
          type: "error",
        });
        console.error("Lỗi khi gửi tin ZNS: ", res.error);
      }
    } catch (e: any) {
      console.error(e);
      await modal.alert({
        title: "Lỗi hệ thống",
        message: "Lỗi hệ thống khi gửi tin ZNS: " + e.message,
        type: "error",
      });
    } finally {
      setSendingZns(false);
    }
  };

  if (loading && reminders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderServiceBadge = (label: string) => {
    switch (label) {
      case "MUA XE":
        return <span className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-[10px] tracking-wide">MUA XE</span>;
      case "DỊCH VỤ SỬA CHỮA":
        return <span className="px-2.5 py-1 bg-indigo-700 text-white font-bold rounded-lg text-[10px] tracking-wide">DỊCH VỤ SỬA CHỮA</span>;
      default:
        return <span className="px-2.5 py-1 bg-secondary text-foreground font-bold rounded-lg text-[10px] tracking-wide">{label}</span>;
    }
  };

  const renderTable = (items: ReminderItem[], noDataText: string) => {
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-[20%]">Khách hàng</th>
            <th className="w-[15%]">Xe</th>
            <th className="w-[20%]">Loại dịch vụ</th>
            <th className="w-[15%]">Ngày dự kiến</th>
            <th className="w-[10%]">Trạng thái</th>
            <th className="w-[20%] text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-secondary/15 transition-colors">
              <td>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{item.customer.name}</span>
                  <span className="text-[11px] text-muted-foreground">{item.customer.phone}</span>
                </div>
              </td>
              <td>
                <span className="font-semibold text-xs bg-secondary/80 text-foreground px-2 py-0.5 rounded border border-border">
                  {item.plate}
                </span>
              </td>
              <td>{renderServiceBadge(item.serviceLabel)}</td>
              <td>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs">{formatDate(item.dueDate.toISOString())}</span>
                  {item.isOverdue ? (
                    <span className="text-red-500 text-[10px] font-bold">Trễ {Math.abs(item.daysRemaining)} ngày</span>
                  ) : (
                    <span className="text-muted-foreground text-[10px] font-semibold">Còn {item.daysRemaining} ngày</span>
                  )}
                </div>
              </td>
              <td>
                {item.isReminded ? (
                  <span className="px-2.5 py-0.5 bg-success text-white font-bold rounded text-[10px]">ĐÃ NHẮC</span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-neutral-600 text-white font-bold rounded text-[10px]">CHƯA NHẮC</span>
                )}
              </td>
              <td className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleOpenHistoryModal(item)}
                    className="px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
                    title="Xem chi tiết giao dịch lần trước"
                  >
                    <Info size={12} /> Chi tiết
                  </button>
                  <button
                    onClick={() => handleOpenZnsModal(item)}
                    className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-md shadow-primary/15"
                  >
                    <Send size={11} /> Gửi ZNS
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-6 text-xs text-muted-foreground font-semibold">
                {noDataText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6 stagger">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Lịch chăm sóc khách hàng</h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overdue */}
        <div 
          onClick={() => setActiveTab("overdue")}
          className={`p-4 bg-card border-l-4 border-red-500 rounded-xl shadow-md flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] ${
            activeTab === "overdue" ? "ring-2 ring-red-500/25 bg-red-500/5" : ""
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Quá hạn</span>
            <p className="text-3xl font-extrabold text-red-500">{overdueCount}</p>
          </div>
          <AlertTriangle className="text-red-500/80" size={24} />
        </div>

        {/* Upcoming */}
        <div 
          onClick={() => setActiveTab("upcoming")}
          className={`p-4 bg-card border-l-4 border-amber-500 rounded-xl shadow-md flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] ${
            activeTab === "upcoming" ? "ring-2 ring-amber-500/25 bg-amber-500/5" : ""
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Sắp đến (≤14 ngày)</span>
            <p className="text-3xl font-extrabold text-amber-500">{upcomingCount}</p>
          </div>
          <Clock className="text-amber-500/80" size={24} />
        </div>

        {/* Farther */}
        <div 
          onClick={() => setActiveTab("farther")}
          className={`p-4 bg-card border-l-4 border-slate-500 rounded-xl shadow-md flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] ${
            activeTab === "farther" ? "ring-2 ring-slate-500/25 bg-slate-500/5" : ""
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Xa hơn</span>
            <p className="text-3xl font-extrabold text-slate-700 dark:text-slate-300">{fartherCount}</p>
          </div>
          <Calendar className="text-slate-500/80" size={24} />
        </div>

        {/* Reminded */}
        <div 
          onClick={() => setActiveTab("reminded")}
          className={`p-4 bg-card border-l-4 border-emerald-500 rounded-xl shadow-md flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] ${
            activeTab === "reminded" ? "ring-2 ring-emerald-500/25 bg-emerald-500/5" : ""
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Đã nhắc</span>
            <p className="text-3xl font-extrabold text-emerald-500">{remindedCount}</p>
          </div>
          <CheckCircle2 className="text-emerald-500/80" size={24} />
        </div>
      </div>

      {/* Search Filter and Tab Selector Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khách hàng, biển số xe, số điện thoại..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex border-b border-border gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "overdue"
                ? "border-red-500 text-red-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle size={14} />
            <span>QUÁ HẠN ({overdueItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock size={14} />
            <span>SẮP ĐẾN HẠN ({upcomingItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("farther")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "farther"
                ? "border-slate-500 text-slate-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={14} />
            <span>XA HƠN ({fartherItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("reminded")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "reminded"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>ĐÃ NHẮC GẦN ĐÂY ({remindedItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border shadow-xl">
        {activeTab === "overdue" && (
          <>
            <div className="px-5 py-3 bg-red-950/95 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danh sách quá hạn ({overdueItems.length})</h3>
              </div>
            </div>
            {renderTable(overdueItems, "Không có lịch quá hạn")}
          </>
        )}

        {activeTab === "upcoming" && (
          <>
            <div className="px-5 py-3 bg-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-orange-200" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danh sách sắp đến hạn ({upcomingItems.length})</h3>
              </div>
            </div>
            {renderTable(upcomingItems, "Không có lịch sắp đến hạn")}
          </>
        )}

        {activeTab === "farther" && (
          <>
            <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-slate-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danh sách cần chăm sóc xa hơn ({fartherItems.length})</h3>
              </div>
            </div>
            {renderTable(fartherItems, "Không có lịch cần chăm sóc xa hơn")}
          </>
        )}

        {activeTab === "reminded" && (
          <>
            <div className="px-5 py-3 bg-emerald-850 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danh sách đã nhắc trong 30 ngày qua ({remindedItems.length})</h3>
              </div>
            </div>
            {renderTable(remindedItems, "Không có khách hàng nào đã được nhắc trong 30 ngày qua")}
          </>
        )}
      </div>

      {/* ZNS Send Modal with Template Selection */}
      {modalOpen && selectedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in-bottom">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border bg-secondary/15 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare size={18} />
                <h3 className="font-bold text-sm uppercase">Gửi tin nhắn Zalo ZNS</h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 bg-secondary/25 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Khách hàng:</span>
                  <strong className="text-foreground">{selectedReminder.customer.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Số điện thoại:</span>
                  <strong className="text-foreground">{selectedReminder.customer.phone}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Biển số xe:</span>
                  <strong className="text-foreground bg-card border px-1.5 py-0.5 rounded text-[10px] font-semibold inline-block">
                    {selectedReminder.plate}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Dịch vụ nhắc:</span>
                  <strong className="text-primary">{selectedReminder.serviceLabel}</strong>
                </div>
              </div>

              {/* Template Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
                  Chọn mẫu tin nhắn ZNS
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
                >
                  {templates.filter(t => t.status === "ACTIVE").map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Content Preview/Edit */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground">
                    Nội dung tin nhắn gửi đi
                  </label>
                  <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
                    <Sparkles size={8} /> Tự động cá nhân hóa
                  </span>
                </div>
                <textarea
                  value={compiledContent}
                  onChange={(e) => setCompiledContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 bg-secondary/10 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-border text-xs rounded-xl hover:bg-secondary/40 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={sendingZns}
                onClick={handleSendZns}
                className="px-5 py-2 gradient-primary text-white text-xs font-bold rounded-xl hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-primary/10"
              >
                {sendingZns ? <Loader2 size={13} className="animate-spin" /> : <Send size={11} />}
                Gửi ZNS ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && historyReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-in-bottom">
            <div className="px-5 py-4 border-b border-border bg-secondary/15 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Clock size={18} />
                <h3 className="font-bold text-sm uppercase">Chi tiết lịch sử dịch vụ trải nghiệm</h3>
              </div>
              <button 
                onClick={() => setHistoryModalOpen(false)} 
                className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              {/* Left Column - Customer and Purchase Details */}
              <div className="space-y-4">
                <div className="border border-border p-4 rounded-xl space-y-2 bg-secondary/10 text-xs">
                  <p className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Thông tin khách hàng</p>
                  <p className="font-bold text-sm text-foreground">{historyReminder.customer.name} - {historyReminder.customer.phone}</p>
                  <p className="text-muted-foreground mt-1">Biển số / Xe hiện tại: <span className="font-semibold text-foreground">{historyReminder.plate}</span></p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Thông tin xe đã mua</h4>
                  {historyReminder.customer.lastVehicle ? (
                    <div className="border border-border p-3.5 rounded-xl space-y-2 bg-card text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Dòng xe:</span>
                          <p className="font-semibold">{historyReminder.customer.lastVehicle.model} {historyReminder.customer.lastVehicle.variant || ""}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Màu sắc:</span>
                          <p className="font-semibold">{historyReminder.customer.lastVehicle.color || "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Số khung (VIN):</span>
                          <p className="font-mono font-semibold">{historyReminder.customer.lastVehicle.vin}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ngày mua:</span>
                          <p className="font-semibold">{formatDate(historyReminder.customer.lastVehicle.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Không có dữ liệu mua xe hệ thống.</p>
                  )}
                </div>
              </div>

              {/* Right Column - Repair Order Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Lượt sửa chữa gần nhất</h4>
                {historyReminder.customer.lastRepairOrder ? (
                  <div className="border border-border p-3.5 rounded-xl space-y-3 bg-card text-xs">
                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-border">
                      <div>
                        <span className="text-muted-foreground">Mã lượt dịch vụ:</span>
                        <p className="font-semibold text-foreground">#RO-{historyReminder.customer.lastRepairOrder.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ngày thực hiện:</span>
                        <p className="font-semibold text-foreground">{formatDate(historyReminder.customer.lastRepairOrder.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Xe làm dịch vụ:</span>
                        <p className="font-semibold text-foreground">{historyReminder.customer.lastRepairOrder.plateNumber} {historyReminder.customer.lastRepairOrder.vehicleModel ? `(${historyReminder.customer.lastRepairOrder.vehicleModel})` : ""}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Số KM vào xưởng:</span>
                        <p className="font-semibold text-foreground">{historyReminder.customer.lastRepairOrder.kmIn?.toLocaleString() || 0} km</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Người sửa chữa (Kỹ thuật viên):</span>
                        <p className="font-bold text-primary text-xs">
                          {historyReminder.customer.lastRepairOrder.technician ? (
                            `${historyReminder.customer.lastRepairOrder.technician.name} ${historyReminder.customer.lastRepairOrder.technician.phone ? `(${historyReminder.customer.lastRepairOrder.technician.phone})` : ""}`
                          ) : (
                            "Chưa phân công / Không có"
                          )}
                        </p>
                      </div>
                      {historyReminder.customer.lastRepairOrder.symptoms && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Yêu cầu / Triệu chứng của khách:</span>
                          <p className="font-medium text-foreground bg-secondary/15 p-2 rounded mt-0.5">
                            {parseSymptoms(historyReminder.customer.lastRepairOrder.symptoms).summary || "Không ghi chú triệu chứng"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-[11px] text-muted-foreground">Chi tiết phụ tùng & công việc:</p>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                        {historyReminder.customer.lastRepairOrder.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center bg-secondary/20 p-2 rounded text-[11px]">
                            <span className="font-medium truncate max-w-[70%]">{item.productName}</span>
                            <span className="font-bold text-muted-foreground">x{item.quantity} ({formatCurrency(item.totalPrice)})</span>
                          </div>
                        ))}
                        {(!historyReminder.customer.lastRepairOrder.items || historyReminder.customer.lastRepairOrder.items.length === 0) && (
                          <p className="text-[10px] text-muted-foreground italic">Không có danh mục phụ tùng.</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border space-y-1 text-right">
                      <div className="text-[11px] text-muted-foreground flex justify-between">
                        <span>Tiền công thợ:</span>
                        <span className="font-medium">{formatCurrency(historyReminder.customer.lastRepairOrder.laborCost)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between">
                        <span>Tiền phụ tùng:</span>
                        <span className="font-medium">{formatCurrency(historyReminder.customer.lastRepairOrder.partsCost)}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground flex justify-between pt-1 border-t border-dashed border-border">
                        <span>Tổng chi phí:</span>
                        <span className="text-primary text-sm">{formatCurrency(historyReminder.customer.lastRepairOrder.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Chưa có lượt làm dịch vụ sửa chữa nào trước đây.</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 bg-secondary/10 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 gradient-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
