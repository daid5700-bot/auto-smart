"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exportToCsv, formatDate, formatExportDate } from "@/lib/utils";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search,
  Download,
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";

export default function ZnsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsSearch, setLogsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (pageVal = 1, searchVal = "", statusVal = statusFilter, from = dateFrom, to = dateTo) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const res = await fetch(
        `/api/crm?tab=zns&page=${pageVal}&limit=20&search=${encodeURIComponent(searchVal)}&status=${statusVal}&dateFrom=${from}&dateTo=${to}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải lịch sử Zalo OA");
      setLogs(data.znsLogs || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error(e);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, logsSearch, statusFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(page, logsSearch, statusFilter, dateFrom, dateTo);
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      activeRequest.current?.abort();
    };
  }, [dateFrom, dateTo, fetchData, page, logsSearch, statusFilter]);

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
      case "DELIVERED":
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

  const filteredLogs = logs;

  const handleExportExcel = () => {
    exportToCsv(
      `Lich_su_Zalo_ZNS_${dateFrom || "tat-ca"}_${dateTo || "den-hien-tai"}.csv`,
      ["Thời gian", "Khách hàng", "Số điện thoại", "Loại tin nhắn", "Nội dung", "Trạng thái", "Lỗi"],
      filteredLogs.map((log: any) => [
        formatExportDate(log.sentAt),
        log.customer?.name || "",
        log.phone || "",
        znsLabel(log.messageType),
        log.content || "",
        log.status || "",
        log.error || "",
      ]),
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">

      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="bg-transparent text-sm font-semibold outline-none"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <span className="text-xs font-semibold text-muted-foreground">Đến</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="bg-transparent text-sm font-semibold outline-none"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Xóa
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} /> Xuất Excel
          </button>
        </div>
        {/* Search + delivery status filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="Tìm theo tên khách hàng, số điện thoại, nội dung tin nhắn..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <div className="sm:w-56">
            <CustomSelect
              id="zns-status-filter"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as typeof statusFilter)}
              options={[
                { value: "ALL", label: "Tất cả trạng thái" },
                { value: "SUCCESS", label: "Gửi thành công", badge: "Thành công", badgeVariant: "success" },
                { value: "FAILED", label: "Gửi thất bại", badge: "Thất bại", badgeVariant: "danger" },
              ]}
              size="md"
            />
          </div>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl mt-4">
            <div className="text-xs text-muted-foreground font-semibold">
              Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} / {totalCount} tin nhắn
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setPage(1); setLoading(true); }}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); setLoading(true); }}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setLoading(true); }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      p === page
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setLoading(true); }}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => { setPage(totalPages); setLoading(true); }}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
