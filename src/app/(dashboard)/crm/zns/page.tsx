"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search
} from "lucide-react";

export default function ZnsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsSearch, setLogsSearch] = useState("");

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
  }, []);

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

  // Filter logs
  const filteredLogs = logs.filter(l => 
    l.customer?.name.toLowerCase().includes(logsSearch.toLowerCase()) ||
    l.phone.includes(logsSearch) ||
    l.content.toLowerCase().includes(logsSearch.toLowerCase()) ||
    znsLabel(l.messageType).toLowerCase().includes(logsSearch.toLowerCase())
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
          <h2 className="text-2xl font-bold">Lịch sử gửi Zalo ZNS</h2>
        </div>
      </div>

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
    </div>
  );
}
