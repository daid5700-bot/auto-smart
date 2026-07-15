"use client";
import { useEffect, useState } from "react";
import { Loader2, Gift, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { redeemPointsDb } from "@/app/actions";
import { useModal } from "@/components/ModalProvider";


// FIX #5: NumericInput — hiển thị số thô khi đang focus để không phá vỡ IME tiếng Việt
const NumericInput = ({ value, onChange, className, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = isFocused
    ? (value === "" ? "" : value.toString())
    : (value === "" ? "" : Number(value).toLocaleString("vi-VN"));
  const handleChange = (e: any) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw === "" ? "" : parseInt(raw, 10));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={className}
      {...props}
    />
  );
};

export default function LoyaltyPage() {
  const modal = useModal();
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState<number | "">(10);
  const [description, setDescription] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/crm?tab=customers&limit=200&allBranches=true");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (pageVal = 1, searchVal = "") => {
    try {
      const res = await fetch(`/api/crm?tab=loyalty&page=${pageVal}&limit=10&search=${encodeURIComponent(searchVal)}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTransactions(page, searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [page, searchQuery]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await modal.confirm({
      title: "Xác nhận quy đổi điểm",
      message: `Bạn có chắc chắn muốn quy đổi ${pointsToRedeem} điểm cho khách hàng này?`,
      type: "warning",
      confirmText: "Quy đổi",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      const discount = await redeemPointsDb({
        customerId: parseInt(customerId),
        points: Number(pointsToRedeem) || 0,
        description: description.trim() || undefined,
      });
      const successMessage = `Quy đổi điểm thành công! Khách hàng được giảm giá ${formatCurrency(discount)} trên hóa đơn.`;
      setSuccessMsg(successMessage);
      setCustomerId("");
      setPointsToRedeem(10);
      setDescription("");
      await modal.alert({
        title: "Thành công",
        message: successMessage,
        type: "success",
      });
      await fetchCustomers();
      await fetchTransactions(page, searchQuery);
    } catch (err: any) {
      await modal.alert({
        title: "Thất bại",
        message: err.message || "Gặp lỗi khi quy đổi điểm",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const filteredTransactions = transactions;

  return (
    <div className="space-y-6 stagger">

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
                  <option key={c.id} value={c.id}>{c.name} - {c.phone} (Điểm: {c.loyaltyPoints})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Số điểm quy đổi</label>
              <NumericInput
                required
                value={pointsToRedeem}
                onChange={(val: any) => setPointsToRedeem(val)}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none font-semibold text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase">Mã hóa đơn / Ghi chú</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: HD-0012, Lệnh dịch vụ..."
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
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

      {/* Deduction History */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-bold text-lg">Lịch sử trừ điểm (Khấu trừ hóa đơn)</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <input
              type="text"
              placeholder="Tìm tên, SĐT, mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-secondary/30 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày giao dịch</th>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Số điểm đã trừ</th>
                <th>Giá trị quy đổi</th>
                <th>Nội dung / Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground italic">
                    Chưa có lịch sử trừ điểm nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="font-semibold">{tx.customer?.name}</td>
                    <td>{tx.customer?.phone}</td>
                    <td className="font-bold text-destructive">{tx.points} điểm</td>
                    <td className="font-semibold text-success">{formatCurrency(Math.abs(tx.points) * 1000)}</td>
                    <td className="text-xs text-muted-foreground">{tx.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-card border-t border-border">
            <div className="text-xs text-muted-foreground font-semibold">
              Hiển thị {(page - 1) * 10 + 1}–{Math.min(page * 10, totalCount)} / {totalCount} giao dịch
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setPage(1); }}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); }}
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
                    onClick={() => { setPage(p); }}
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
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => { setPage(totalPages); }}
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
