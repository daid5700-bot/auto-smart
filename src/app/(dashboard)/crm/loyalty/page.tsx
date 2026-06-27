"use client";
import { useEffect, useState } from "react";
import { Loader2, Gift, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { redeemPointsDb } from "@/app/actions";

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState<number | "">(10);
  const [successMsg, setSuccessMsg] = useState("");

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

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const discount = await redeemPointsDb({
        customerId: parseInt(customerId),
        points: Number(pointsToRedeem) || 0,
      });
      setSuccessMsg(`Quy đổi điểm thành công! Khách hàng được giảm giá ${formatCurrency(discount)} trên hóa đơn.`);
      setCustomerId("");
      setPointsToRedeem(10);
      await fetchData();
    } catch (err: any) {
      alert("Lỗi quy đổi điểm: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Chương trình Tích điểm Thành viên (Loyalty)</h2>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Redeem points form */}
        <div className="glass-card rounded-xl p-6 h-fit space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Gift size={20} />
            <h3 className="font-bold">Quy đổi điểm thưởng</h3>
          </div>
          <p className="text-xs text-muted-foreground">Tỷ lệ quy đổi: 1 điểm = 1.000đ khấu trừ vào hóa đơn sửa chữa dịch vụ.</p>
          <form onSubmit={handleRedeem} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Chọn khách hàng</label>
              <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none">
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (Điểm hiện tại: {c.loyaltyPoints})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Số điểm quy đổi</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                required
                value={pointsToRedeem === "" ? "" : Number(pointsToRedeem).toLocaleString("vi-VN")}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, "");
                  setPointsToRedeem(cleanVal === "" ? "" : parseInt(cleanVal, 10));
                }}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none font-semibold text-primary"
              />
            </div>
            {successMsg && <p className="text-xs text-success font-semibold bg-success/10 p-2.5 rounded-lg border border-success/20">{successMsg}</p>}
            <button type="submit" className="w-full py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">Tiến hành khấu trừ</button>
          </form>
        </div>

        {/* Right column — List of customers with points */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Điểm tích lũy</th>
                <th>Giá trị quy đổi tối đa</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.phone}</td>
                  <td className="font-bold text-amber-600">{c.loyaltyPoints} điểm</td>
                  <td className="font-semibold text-success">{formatCurrency(c.loyaltyPoints * 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
