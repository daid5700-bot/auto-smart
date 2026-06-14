"use client";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function ZnsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      case "PROMO": return "Chương trình khuyến mãi";
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
            <Clock size={12} /> Đang xử lý
          </span>
        );
    }
  };

  if (loading && logs.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Lịch sử Zalo ZNS</h2>
        <p className="text-muted-foreground text-sm mt-1">Nhật ký các tin nhắn Zalo Notification Service tự động được gửi từ hệ thống CRM</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Khách hàng nhận</th>
              <th>Số điện thoại</th>
              <th>Loại tin nhắn</th>
              <th>Nội dung gửi</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id}>
                <td className="text-muted-foreground text-xs">{formatDate(l.sentAt)}</td>
                <td className="font-semibold">{l.customer?.name}</td>
                <td>{l.phone}</td>
                <td><span className="badge badge-primary text-[10px]">{znsLabel(l.messageType)}</span></td>
                <td className="max-w-md truncate font-medium text-xs text-muted-foreground" title={l.content}>{l.content}</td>
                <td>{renderStatus(l.status, l.error)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có tin nhắn ZNS nào được gửi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
