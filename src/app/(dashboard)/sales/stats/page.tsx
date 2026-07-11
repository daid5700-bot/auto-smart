"use client";
import { useEffect, useState } from "react";
import { fetchWithDedup, formatCurrency, formatDate } from "@/lib/utils";
import { Car, DollarSign, CheckCircle, TrendingUp, TrendingDown, Banknote, ShieldCheck, Loader2, RefreshCw, X, Tag, Package, Boxes, BarChart2, Clock } from "lucide-react";

function StatCard({ label, value, sub, color, icon }: any) {
  const colors: any = {
    blue: "border-l-blue-500 text-blue-600 dark:text-blue-400",
    emerald: "border-l-emerald-500 text-emerald-600 dark:text-emerald-400",
    amber: "border-l-amber-500 text-amber-600 dark:text-amber-400",
    purple: "border-l-purple-500 text-purple-600 dark:text-purple-400",
    rose: "border-l-rose-500 text-rose-600 dark:text-rose-400",
  };
  return (
    <div className={`glass-card rounded-xl p-4 border-l-4 ${colors[color]} hover:-translate-y-0.5 transition-transform`}>
      <div className="flex items-center justify-between mb-2">{icon}<p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p></div>
      <p className={`text-xl font-bold tracking-tight ${colors[color]}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function SalesStatsPage() {
  const [data, setData] = useState<any>(null);
  const [invData, setInvData] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true); setError(null);
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      const qs = q.toString();
      const [d1, d2] = await Promise.all([fetchWithDedup(`/api/stats/sales?${qs}`), fetchWithDedup(`/api/stats/inventory?${qs}`)]);
      setData(d1); setInvData(d2);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [startDate, endDate]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
  if (error || !data) return <div className="p-6 text-center"><p className="text-destructive mb-4">{error}</p><button onClick={fetchStats} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"><RefreshCw size={14}/> Thử lại</button></div>;

  // --- Vehicle chart data ---
  const monthlySales = data.monthlySales || [];
  const maxVal = Math.max(...monthlySales.map((r: any) => r.value), 1);
  const W = 900; const H = 200; const px = 40; const py = 20;
  const pts = monthlySales.map((m: any, i: number) => ({ x: (i / Math.max(monthlySales.length - 1, 1)) * W + px, y: H - (m.value / maxVal) * (H - 40) + py, label: m.label, value: m.value }));
  const line = pts.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = pts.length > 0 ? `${line} L ${pts[pts.length-1].x} ${H+py} L ${pts[0].x} ${H+py} Z` : "";
  const trend = data.trendPercentage ?? 0;

  // --- Totals ---
  const vehicleTotal = (Number(data.soldValue)||0) + (Number(data.totalPlateCost)||0) + (Number(data.totalAccessoriesCost)||0);
  const partsTotal = Number(invData?.totalSoldAmount) || 0;
  const grandTotal = vehicleTotal + partsTotal;

  return (
    <div className="space-y-8 stagger">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Báo cáo thống kê</p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">Kinh doanh tổng hợp</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold">
            <span className="text-muted-foreground">Từ:</span>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-foreground w-[125px] text-xs"/>
            <span className="text-muted-foreground border-l border-border pl-2">Đến:</span>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-foreground w-[125px] text-xs"/>
            {(startDate||endDate) && <button onClick={()=>{setStartDate("");setEndDate("");}} className="text-muted-foreground hover:text-destructive ml-1"><X size={14}/></button>}
          </div>
          <button onClick={fetchStats} className="p-2.5 hover:bg-secondary rounded-xl text-primary border border-border bg-card transition-colors"><RefreshCw size={16}/></button>
        </div>
      </div>


      {/* ====== MẢNG 1: BÁN XE ====== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-blue-500/10"><Car size={18} className="text-blue-500"/></div>
          <div><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mảng 1</p><h3 className="text-xl font-bold">Bán xe</h3></div>
        </div>

        {/* Sub-cards bán xe */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Số xe đã bán" value={String(data.soldVehicles)} sub="Giao dịch hoàn tất" color="emerald" icon={<CheckCircle size={16} className="text-emerald-500"/>}/>
          <StatCard label="Doanh thu xe" value={formatCurrency(Number(data.soldValue)||0)} sub="Giá niêm yết" color="blue" icon={<DollarSign size={16} className="text-blue-500"/>}/>
          <StatCard label="Phí làm biển" value={formatCurrency(Number(data.totalPlateCost)||0)} sub="Đăng ký biển số" color="amber" icon={<ShieldCheck size={16} className="text-amber-500"/>}/>
          <StatCard label="Phụ kiện kèm" value={formatCurrency(Number(data.totalAccessoriesCost)||0)} sub="Bán kèm xe" color="purple" icon={<Tag size={16} className="text-purple-500"/>}/>
        </div>

        {/* Chart xe bán */}
        <div className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div><p className="text-[11px] font-bold text-muted-foreground uppercase">Xu hướng bán xe (12 tháng)</p><h4 className="text-base font-bold">Số xe chốt sales</h4></div>
            {trend >= 0
              ? <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"><TrendingUp size={12}/> +{trend}%</span>
              : <span className="text-xs font-semibold text-rose-500 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20"><TrendingDown size={12}/> {trend}%</span>}
          </div>
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W+px*2} ${H+py*2}`} className="w-full h-auto min-w-[400px]">
              <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>
              {[0,1,2,3].map(i=><line key={i} x1={px} y1={py+40+(i/3)*(H-40)} x2={W+px} y2={py+40+(i/3)*(H-40)} stroke="#e4e4e7" strokeWidth={0.5} strokeDasharray="3 3"/>)}
              {pts.length>0&&<><path d={area} fill="url(#cg)"/><path d={line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{pts.map((p:any,i:number)=><g key={i}><circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5"/><title>{p.label}: {p.value} xe</title></g>)}</>}
              {pts.map((p:any,i:number)=><text key={i} x={p.x} y={H+py+14} textAnchor="middle" className="text-[10px] fill-muted-foreground font-bold">{p.label}</text>)}
            </svg>
          </div>
        </div>

        {/* Bảng xe đã bán */}
        <div className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-2"><Clock size={15} className="text-muted-foreground"/><h4 className="font-bold text-sm">Danh sách xe đã bán</h4></div>
            <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">{data.soldList?.length||0} giao dịch</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead><tr className="border-b border-border bg-secondary/20 text-muted-foreground font-bold">
                <th className="p-3 w-8 text-center">#</th><th className="p-3">Xe</th><th className="p-3">VIN</th><th className="p-3">Khách hàng</th>
                <th className="p-3 text-right">Giá xe</th><th className="p-3 text-right">Phí biển</th><th className="p-3 text-right">Phụ kiện</th><th className="p-3 text-right">Tổng</th><th className="p-3 text-center">Ngày</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.soldList?.map((item: any, idx: number) => {
                  const pCost = Number(item.plateCost)||0;
                  let aCost = 0;
                  try { const a = typeof item.accessoriesJson === "string" ? JSON.parse(item.accessoriesJson) : item.accessoriesJson || []; aCost = a.reduce((s:number,x:any)=>{const p=parseInt(String(x.price||"0").replace(/\D/g,""),10)||0;const q=parseFloat(String(x.quantity||"1").replace(/[^0-9.]/g,""))||1;return s+p*q;},0); } catch{}
                  return (
                    <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-3 text-center text-muted-foreground font-semibold">{idx+1}</td>
                      <td className="p-3 font-bold">{item.model}{item.variant&&<span className="text-[10px] text-muted-foreground block font-normal">{item.variant} · {item.color||"N/A"}</span>}</td>
                      <td className="p-3 font-mono text-muted-foreground">{item.vin?.slice(-6)||"N/A"}</td>
                      <td className="p-3">{item.customer?<div><span className="font-semibold block">{item.customer.name}</span><span className="text-[10px] text-muted-foreground">{item.customer.phone}</span></div>:<span className="text-muted-foreground italic">Vãng lai</span>}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(item.listPrice)||0)}</td>
                      <td className="p-3 text-right text-muted-foreground">{pCost>0?formatCurrency(pCost):"-"}</td>
                      <td className="p-3 text-right text-muted-foreground">{aCost>0?formatCurrency(aCost):"-"}</td>
                      <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency((Number(item.listPrice)||0)+pCost+aCost)}</td>
                      <td className="p-3 text-center text-muted-foreground">{formatDate(item.updatedAt)}</td>
                    </tr>
                  );
                })}
                {(!data.soldList||data.soldList.length===0)&&<tr><td colSpan={9} className="p-8 text-center text-muted-foreground italic">Chưa có dữ liệu xe đã bán</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ====== MẢNG 2: PHỤ TÙNG ====== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-purple-500/10"><Package size={18} className="text-purple-500"/></div>
          <div><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mảng 2</p><h3 className="text-xl font-bold">Phụ tùng &amp; Kho bãi</h3></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Tổng sản phẩm" value={String(invData?.totalProducts||0)} sub="Đang hoạt động" color="purple" icon={<Boxes size={16} className="text-purple-500"/>}/>
          <StatCard label="Doanh thu xuất kho" value={formatCurrency(partsTotal)} sub="Theo kỳ lọc" color="blue" icon={<DollarSign size={16} className="text-blue-500"/>}/>
          <StatCard label="Số lượng xuất" value={String(Number(invData?.totalSoldQty)||0)} sub="Sản phẩm" color="emerald" icon={<BarChart2 size={16} className="text-emerald-500"/>}/>
          <StatCard label="Cảnh báo tồn kho" value={String(invData?.lowStockCount||0)} sub="Dưới mức tối thiểu" color="rose" icon={<ShieldCheck size={16} className="text-rose-500"/>}/>
        </div>

        {/* Bảng xuất kho */}
        <div className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-2"><Package size={15} className="text-muted-foreground"/><h4 className="font-bold text-sm">Chi tiết phiếu xuất kho phụ tùng</h4></div>
            <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">{invData?.exportCount||0} phiếu</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead><tr className="border-b border-border bg-secondary/20 text-muted-foreground font-bold">
                <th className="p-3 w-8 text-center">#</th><th className="p-3">Sản phẩm</th><th className="p-3">SKU</th>
                <th className="p-3 text-right">SL</th><th className="p-3 text-right">Đơn giá</th><th className="p-3 text-right">Thành tiền</th>
                <th className="p-3">Lý do</th><th className="p-3 text-center">Ngày</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {invData?.exports?.slice(0,30).map((item: any, idx: number) => (
                  <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 text-center text-muted-foreground font-semibold">{idx+1}</td>
                    <td className="p-3 font-bold">{item.product?.name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{item.product?.sku}</td>
                    <td className="p-3 text-right">{item.quantity} {item.product?.unit}</td>
                    <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.product?.price||0)}</td>
                    <td className="p-3 text-right font-bold text-purple-600 dark:text-purple-400">{formatCurrency(item.totalCost||0)}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[120px]">{item.reason||"-"}</td>
                    <td className="p-3 text-center text-muted-foreground">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
                {(!invData?.exports||invData.exports.length===0)&&<tr><td colSpan={8} className="p-8 text-center text-muted-foreground italic">Chưa có phiếu xuất kho trong kỳ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>


    </div>
  );
}
