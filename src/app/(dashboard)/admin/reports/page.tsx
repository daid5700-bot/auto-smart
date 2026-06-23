"use client";
import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Wrench,
  Car, Package, Loader2, Download, Printer, Minus, RefreshCw, X, Calendar
} from "lucide-react";
import { formatCurrency, exportToCsv } from "@/lib/utils";

interface ReportData {
  branchId: number | null;
  summary: {
    totalWorkshopRevenue: number;
    currentMonthRevenue: number;
    revenueGrowth: number | null;
    completedRepairOrders: number;
    currentMonthROCount: number;
    roGrowth: number | null;
    activeKtv: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    newLeadsThisMonth: number;
    convertedLeads: number;
    totalVehiclesAvailable: number;
    totalVehiclesSold: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { name: string; sku: string; qty: number; revenue: number }[];
  recentOrders: {
    id: number;
    plateNumber: string;
    vehicleModel: string | null;
    customer: string;
    technician: string;
    totalAmount: number;
    status: string;
    completedAt: string;
  }[];
  leadsBreakdown: Record<string, number>;
  customerSources: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  DIAGNOSING: "Đang chuẩn đoán",
  DOING: "Đang sửa",
  WAITING_PARTS: "Chờ phụ tùng",
  DONE: "Hoàn thành",
  DELIVERED: "Đã giao xe",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Mới",
  CONSULTING: "Đang tư vấn",
  POTENTIAL: "Tiềm năng",
  CONVERTED: "Đã chuyển đổi",
  LOST: "Đã mất",
};

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  WEBSITE: "Website",
  WALKIN: "Trực tiếp",
  REFERRAL: "Giới thiệu",
};

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] text-muted-foreground">Chưa đủ dữ liệu</span>;
  if (value > 0) return <div className="text-[10px] text-green-600 font-semibold flex items-center gap-1"><TrendingUp size={10} />+{value}% so với kỳ trước</div>;
  if (value < 0) return <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1"><TrendingDown size={10} />{value}% so với kỳ trước</div>;
  return <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1"><Minus size={10} />Không thay đổi</div>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Không thể tải báo cáo");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const handleExportExcel = () => {
    if (!data) return;
    const headers = ["Danh mục báo cáo", "Chỉ số / Giá trị", "Đánh giá chi tiết"];
    const rows: string[][] = [
      ["Doanh thu xưởng (kỳ này)", formatCurrency(data.summary.currentMonthRevenue), data.summary.revenueGrowth !== null ? `${data.summary.revenueGrowth > 0 ? "+" : ""}${data.summary.revenueGrowth}% so với kỳ trước` : "—"],
      ["Lệnh sửa chữa hoàn thành", `${data.summary.completedRepairOrders} lệnh`, `Kỳ này: ${data.summary.currentMonthROCount}`],
      ["KTV đang hoạt động", `${data.summary.activeKtv} KTV`, ""],
      ["Tổng khách hàng", `${data.summary.totalCustomers}`, `Mới trong kỳ: ${data.summary.newCustomersThisMonth}`],
      ["Leads mới trong kỳ", `${data.summary.newLeadsThisMonth}`, `Đã chuyển đổi: ${data.summary.convertedLeads}`],
      ["Xe sẵn có / Đã bán", `${data.summary.totalVehiclesAvailable} / ${data.summary.totalVehiclesSold}`, ""],
      ["", "", ""],
      ["PHỤ TÙNG BÁN CHẠY NHẤT", "SỐ LƯỢNG", "DOANH THU"],
      ...data.topProducts.map((p) => [p.name, `${p.qty} đơn vị`, formatCurrency(p.revenue)]),
    ];
    exportToCsv(`Bao_cao_ERP_${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-destructive font-semibold">{error || "Không tải được báo cáo"}</p>
        <button onClick={fetchData} className="flex items-center gap-2 text-xs text-primary border border-primary rounded-lg px-3 py-2 hover:bg-primary/10">
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6 stagger">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold">Báo cáo & Phân tích ERP</h2>
       
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Time Filter Group */}
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold">
            <span className="text-muted-foreground">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            <span className="text-muted-foreground border-l border-border pl-2">Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none focus:ring-0 text-foreground w-[125px] font-semibold text-xs"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                title="Xóa bộ lọc"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="bg-card border border-border hover:bg-secondary text-foreground p-2.5 rounded-xl text-sm font-semibold flex items-center justify-center transition-all" title="Làm mới">
              <RefreshCw size={15} />
            </button>
            <button onClick={handlePrint} className="bg-card border border-border hover:bg-secondary text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all w-fit">
              <Printer size={16} /> In báo cáo (PDF)
            </button>
            <button onClick={handleExportExcel} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all w-fit">
              <Download size={16} /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Doanh thu xưởng {startDate || endDate ? "(kỳ chọn)" : "(tháng này)"}</span>
            <DollarSign size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black">{formatCurrency(data.summary.currentMonthRevenue)}</p>
          <GrowthBadge value={data.summary.revenueGrowth} />
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Lệnh sửa chữa hoàn thành</span>
            <Wrench size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black">{data.summary.completedRepairOrders} lệnh</p>
          <div className="text-[10px] text-muted-foreground">{startDate || endDate ? "Kỳ chọn:" : "Tháng này:"} {data.summary.currentMonthROCount} lệnh</div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Khách hàng</span>
            <Users size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black">{data.summary.totalCustomers.toLocaleString("vi-VN")}</p>
          <div className="text-[10px] text-green-600 font-semibold">+{data.summary.newCustomersThisMonth} mới {startDate || endDate ? "trong kỳ" : "tháng này"}</div>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Leads & Xe kinh doanh</span>
            <Car size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black">{data.summary.newLeadsThisMonth} leads</p>
          <div className="text-[10px] text-muted-foreground">Xe sẵn có: {data.summary.totalVehiclesAvailable} | Đã bán: {data.summary.totalVehiclesSold}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-bold">Biểu đồ doanh thu xưởng 6 tháng {startDate || endDate ? "(tính đến kỳ lọc)" : "gần nhất"}</h3>
          {data.monthlyRevenue.every((m) => m.revenue === 0) ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm italic">Chưa có dữ liệu doanh thu</div>
          ) : (
            <div className="h-64 flex items-end gap-3 pt-6 border-b border-border">
              {data.monthlyRevenue.map((m, i) => {
                const heightPct = maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 220, m.revenue > 0 ? 12 : 2) : 2;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-1.5 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {m.revenue > 0 ? formatCurrency(m.revenue) : "0 đ"}
                    </div>
                    <div
                      style={{ height: `${heightPct}px` }}
                      className={`w-full rounded-t-lg transition-all ${m.revenue > 0 ? "bg-gradient-to-t from-primary to-cyan-500 glow-blue hover:opacity-95" : "bg-border"}`}
                    />
                    <span className="text-[9px] font-semibold text-muted-foreground mt-1 text-center">{m.month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><Package size={16} className="text-primary" />Phụ tùng bán chạy nhất</h3>
          {data.topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm italic">Chưa có dữ liệu phụ tùng</div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                    <div>
                      <h4 className="text-xs font-bold line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground">SKU: {item.sku} | SL: {item.qty} đơn vị</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0 ml-2">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second row: Leads + Customer Sources + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads breakdown */}
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><BarChart3 size={16} className="text-primary" />Phân loại Leads</h3>
          {Object.keys(data.leadsBreakdown).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Chưa có leads</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.leadsBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{LEAD_STATUS_LABELS[status] ?? status}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer sources */}
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Users size={16} className="text-primary" />Nguồn khách hàng</h3>
          {Object.keys(data.customerSources).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.customerSources).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{SOURCE_LABELS[source] ?? source}</span>
                  <span className="font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KTV / Workshop summary */}
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Wrench size={16} className="text-primary" />Hiệu suất xưởng</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">KTV đang hoạt động</span><span className="font-bold">{data.summary.activeKtv} KTV</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tổng lệnh hoàn thành</span><span className="font-bold">{data.summary.completedRepairOrders}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tổng doanh thu xưởng</span><span className="font-bold text-primary">{formatCurrency(data.summary.totalWorkshopRevenue)}</span></div>
          </div>
        </div>
      </div>

      {/* Recent Completed Repair Orders */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-bold">Lệnh sửa chữa hoàn thành gần nhất</h3>
        </div>
        {data.recentOrders.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground italic">Chưa có lệnh hoàn thành</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Biển số</th>
                <th>Dòng xe</th>
                <th>Khách hàng</th>
                <th>Kỹ thuật viên</th>
                <th>Trạng thái</th>
                <th>Thành tiền</th>
                <th>Ngày hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((ro) => (
                <tr key={ro.id}>
                  <td className="font-mono font-bold text-xs">{ro.plateNumber}</td>
                  <td className="text-xs text-muted-foreground">{ro.vehicleModel || "—"}</td>
                  <td className="text-xs font-semibold">{ro.customer}</td>
                  <td className="text-xs">{ro.technician}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-600">
                      {STATUS_LABELS[ro.status] ?? ro.status}
                    </span>
                  </td>
                  <td className="text-xs font-bold text-primary">{formatCurrency(ro.totalAmount)}</td>
                  <td className="text-xs text-muted-foreground">{new Date(ro.completedAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
