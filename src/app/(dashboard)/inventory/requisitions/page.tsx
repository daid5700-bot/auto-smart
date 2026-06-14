"use client";
import { useEffect, useState } from "react";
import { ClipboardList, Check, X, Eye, AlertCircle, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function PartsRequisitionsApprovalPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/workshop/requisitions")
      .then((r) => r.json())
      .then((data) => {
        setRequisitions(data.requisitions || []);
      })
      .catch((e) => console.error("Error loading requisitions:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt xuất kho cho yêu cầu này?")) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi duyệt yêu cầu.");
      }
      setMessage({ text: "Đã duyệt xuất kho thành công. Tồn kho đã được trừ.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu xuất kho này? Lệnh sửa chữa sẽ được đưa về trạng thái chờ và không tính phụ tùng.")) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi từ chối yêu cầu.");
      }
      setMessage({ text: "Đã từ chối yêu cầu xuất kho thành công.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = requisitions.filter((r) => r.status === "PENDING");
  const historyList = requisitions.filter((r) => r.status !== "PENDING");

  const displayList = activeTab === "PENDING" ? pendingList : historyList;

  if (loading && requisitions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PHÒNG PHỤ TÙNG</p>
          <h2 className="text-2xl font-bold tracking-tight">Duyệt yêu cầu xuất từ xưởng</h2>
          <p className="text-xs text-muted-foreground mt-1">
            KTV tạo lệnh sửa chữa &rarr; chuyển sang <span className="font-bold text-destructive">CHỜ PHỤ TÙNG</span> &rarr; Kho duyệt để trừ tồn kho và chuyển trạng thái lệnh sang bắt đầu sửa chữa.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-secondary/35 border border-border p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "PENDING"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chờ duyệt ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "HISTORY"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lịch sử ({historyList.length})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs max-w-3xl animate-fade-in ${
            message.type === "success"
              ? "bg-success/10 border-success/20 text-success"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <AlertCircle size={15} />
          <span>{message.text}</span>
        </div>
      )}

      {displayList.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-muted-foreground">Không có yêu cầu nào</h3>
          <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
            {activeTab === "PENDING"
              ? "Hiện tại không có yêu cầu xin xuất phụ tùng nào đang chờ xử lý từ xưởng dịch vụ."
              : "Lịch sử duyệt xuất phụ tùng đang trống."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayList.map((req) => {
            const ro = req.repairOrder || {};
            const cust = ro.customer || {};
            const totalBill = req.items.reduce((s: number, item: any) => {
              const prod = item.product || {};
              const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
              return s + Number(item.quantity) * Number(priceVal);
            }, 0);

            return (
              <div key={req.id} className="glass-card rounded-2xl p-5 border border-border/60 space-y-4">
                {/* Header card info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">MÃ LỆNH</span>
                    <h3 className="text-base font-black tracking-tight text-foreground">
                      RO-{ro.id || "CHƯA RÕ"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-bold text-foreground">{cust.name || "Khách vãng lai"}</span>
                      {cust.phone && ` · ${cust.phone}`}
                      {ro.plateNumber && ` · Xe ${ro.plateNumber}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badges */}
                    {req.status === "PENDING" ? (
                      <span className="badge badge-danger uppercase">Chờ phụ tùng</span>
                    ) : req.status === "APPROVED" ? (
                      <span className="badge badge-success uppercase">Đã duyệt xuất</span>
                    ) : (
                      <span className="badge bg-muted text-muted-foreground uppercase">Từ chối</span>
                    )}

                    <div className="text-right text-[11px] text-muted-foreground ml-2">
                      <p className="font-semibold text-foreground">KTV PHỤ TRÁCH</p>
                      <p className="font-medium text-primary">{ro.technician?.name || "Chưa giao việc"}</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/15 text-muted-foreground font-semibold">
                        <th className="p-3">Phụ tùng</th>
                        <th className="p-3 text-center">SL Yêu cầu</th>
                        <th className="p-3 text-center bg-secondary/5">Tồn hiện tại</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {req.items.map((item: any) => {
                        const prod = item.product || {};
                        const isOut = prod.stockCount < item.quantity;
                        const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
                        const subTotal = item.quantity * priceVal;

                        return (
                          <tr key={item.id} className="hover:bg-secondary/5 transition-colors">
                            <td className="p-3">
                              <p className="font-bold text-foreground">{prod.name || "Sản phẩm không rõ"}</p>
                              <p className="text-[10px] text-muted-foreground">{prod.sku || "MÃ-PT"}</p>
                            </td>
                            <td className="p-3 text-center font-semibold text-foreground">
                              {item.quantity} cái
                            </td>
                            <td className={`p-3 text-center font-bold bg-secondary/5 ${isOut && req.status === "PENDING" ? "text-destructive" : "text-foreground"}`}>
                              {prod.stockCount} cái {isOut && req.status === "PENDING" && <span className="text-[9px] font-medium block text-destructive">(Không đủ tồn)</span>}
                            </td>
                            <td className="p-3 text-right font-medium text-muted-foreground">
                              {formatCurrency(priceVal)}
                            </td>
                            <td className="p-3 text-right font-bold text-foreground">
                              {formatCurrency(subTotal)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotal summary */}
                      <tr className="bg-secondary/10 font-semibold text-right">
                        <td colSpan={4} className="p-3 text-muted-foreground font-bold">Tổng bill phụ tùng:</td>
                        <td className="p-3 text-sm font-black text-primary">{formatCurrency(totalBill)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Actions at bottom of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={13} />
                    <span>Yêu cầu lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}</span>
                  </div>

                  <div className="flex items-center gap-2 self-end">
                    <Link
                      href={`/workshop?id=${ro.id}`}
                      className="px-3.5 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={13} /> Xem chi tiết lệnh
                    </Link>

                    {req.status === "PENDING" && (
                      <>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleReject(req.id)}
                          className="px-3.5 py-2 border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <X size={13} /> Từ chối
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleApprove(req.id)}
                          className="px-4 py-2 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          {processingId === req.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Duyệt xuất kho
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
