"use client";
import { useEffect, useState } from "react";
import { ClipboardList, Check, X, Eye, AlertCircle, Loader2, Calendar, Car, User, Settings, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function UnifiedRequisitionsApprovalPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [vehicleOrders, setVehicleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState<"WORKSHOP" | "VEHICLE">("WORKSHOP");
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/workshop/requisitions"),
        fetch("/api/inventory/pending-exports?status=ALL")
      ]);
      
      const d1 = await r1.json();
      const d2 = await r2.json();
      
      setRequisitions(d1.requisitions || []);
      setVehicleOrders(d2.orders || []);
    } catch (e) {
      console.error("Error loading requisitions/orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Workshop approval handlers
  const handleWorkshopApprove = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt xuất kho cho yêu cầu sửa chữa này?")) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi duyệt yêu cầu.");
      setMessage({ text: "Đã duyệt xuất phụ tùng thành công. Kho đã trừ hàng.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkshopReject = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối yêu cầu xuất kho này?")) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi từ chối.");
      setMessage({ text: "Đã từ chối yêu cầu xuất kho sửa chữa.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  // Vehicle accessories approval handlers
  const handleVehicleApprove = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt xuất kho cho phụ kiện kèm xe này? Tồn kho sẽ trừ ngay.")) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/inventory/pending-exports/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi phê duyệt.");
      setMessage({ text: "Đã duyệt xuất phụ kiện kèm xe thành công.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleVehicleReject = async (id: number) => {
    const reason = prompt("Nhập lý do từ chối yêu cầu xuất kho:");
    if (reason === null) return;
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/inventory/pending-exports/${id}/approve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Không đủ hàng tồn kho" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi từ chối.");
      setMessage({ text: "Đã từ chối yêu cầu xuất phụ kiện kèm xe.", type: "success" });
      fetchData();
    } catch (e: any) {
      setMessage({ text: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtration logic
  const pendingWorkshop = requisitions.filter((r) => r.status === "PENDING");
  const historyWorkshop = requisitions.filter((r) => r.status !== "PENDING");

  const pendingVehicle = vehicleOrders.filter((o) => o.status === "PENDING");
  const historyVehicle = vehicleOrders.filter((o) => o.status !== "PENDING");

  const activePendingCount = sourceTab === "WORKSHOP" ? pendingWorkshop.length : pendingVehicle.length;
  const activeHistoryCount = sourceTab === "WORKSHOP" ? historyWorkshop.length : historyVehicle.length;

  const displayList = sourceTab === "WORKSHOP"
    ? (activeTab === "PENDING" ? pendingWorkshop : historyWorkshop)
    : (activeTab === "PENDING" ? pendingVehicle : historyVehicle);

  if (loading && requisitions.length === 0 && vehicleOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger pb-12">
      {/* Header section with two-level tab bar */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PHÒNG PHỤ TÙNG &amp; KHO</p>
            <h2 className="text-2xl font-bold tracking-tight">Duyệt yêu cầu xuất kho</h2>
          </div>

          {/* Pending/History Toggle */}
          <div className="flex items-center bg-secondary/35 border border-border p-1 rounded-xl shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "PENDING"
                  ? "bg-card text-foreground shadow-sm font-bold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chờ duyệt ({activePendingCount})
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "HISTORY"
                  ? "bg-card text-foreground shadow-sm font-bold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lịch sử ({activeHistoryCount})
            </button>
          </div>
        </div>

        {/* Source tab selector: Workshop vs Vehicle Accessories */}
        <div className="flex items-center gap-2 border-t border-border/40 pt-4">
          <button
            onClick={() => setSourceTab("WORKSHOP")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              sourceTab === "WORKSHOP"
                ? "bg-primary/5 text-primary border-primary/20 font-bold"
                : "bg-card text-muted-foreground border-border hover:bg-secondary/40"
            }`}
          >
            <Wrench size={14} />
            <span>Yêu cầu sửa chữa ({pendingWorkshop.length} chờ)</span>
          </button>
          <button
            onClick={() => setSourceTab("VEHICLE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              sourceTab === "VEHICLE"
                ? "bg-primary/5 text-primary border-primary/20 font-bold"
                : "bg-card text-muted-foreground border-border hover:bg-secondary/40"
            }`}
          >
            <Car size={14} />
            <span>Phụ kiện bán kèm xe ({pendingVehicle.length} chờ)</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs max-w-3xl animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
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
              ? "Hiện tại không có yêu cầu nào đang chờ xử lý ở mục này."
              : "Lịch sử duyệt mục này đang trống."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sourceTab === "WORKSHOP" ? (
            // WORKSHOP RENDER SECTION
            displayList.map((req) => {
              const ro = req.repairOrder || {};
              const cust = ro.customer || {};
              const totalBill = req.items.reduce((s: number, item: any) => {
                const prod = item.product || {};
                const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
                return s + Number(item.quantity) * Number(priceVal);
              }, 0);

              return (
                <div key={req.id} className="glass-card rounded-2xl p-5 border border-border/60 space-y-4">
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
                      {req.status === "PENDING" ? (
                        <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-0.5 rounded-full">Chờ phụ tùng</span>
                      ) : req.status === "APPROVED" ? (
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">Đã duyệt xuất</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-0.5 rounded-full">Từ chối</span>
                      )}

                      <div className="text-right text-[11px] text-muted-foreground ml-2">
                        <p className="font-semibold text-foreground">KTV PHỤ TRÁCH</p>
                        <p className="font-medium text-primary">{ro.technician?.name || "Chưa giao việc"}</p>
                      </div>
                    </div>
                  </div>

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
                        <tr className="bg-secondary/10 font-semibold text-right">
                          <td colSpan={4} className="p-3 text-muted-foreground font-bold">Tổng bill phụ tùng:</td>
                          <td className="p-3 text-sm font-black text-primary">{formatCurrency(totalBill)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

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
                            onClick={() => handleWorkshopReject(req.id)}
                            className="px-3.5 py-2 border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <X size={13} /> Từ chối
                          </button>
                          <button
                            disabled={processingId !== null}
                            onClick={() => handleWorkshopApprove(req.id)}
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
            })
          ) : (
            // VEHICLE RENDER SECTION
            displayList.map((order) => {
              const vehicle = order.vehicle || {};
              const customer = order.customer || {};
              const statusColors: any = {
                PENDING: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                PAID: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
                CANCELLED: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
              };

              return (
                <div key={order.id} className="glass-card rounded-2xl p-5 border border-border/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full font-mono font-bold text-muted-foreground">{order.code}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                          {order.status === "PENDING" ? "Chờ duyệt" : order.status === "PAID" ? "Đã duyệt xuất" : "Đã từ chối"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User size={13}/> <strong>Khách hàng:</strong> {customer.name || "Khách vãng lai"} ({customer.phone || "N/A"})</span>
                        {vehicle.vin && (
                          <span className="flex items-center gap-1"><Car size={13}/> <strong>Xe VIN:</strong> {vehicle.model} ({vehicle.vin.slice(-6)})</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Giá trị phụ kiện</p>
                      <p className="text-sm font-black text-primary">{formatCurrency(order.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/15 text-muted-foreground font-semibold">
                          <th className="p-3">Mã &amp; Tên Phụ Tùng</th>
                          <th className="p-3 text-center">Số lượng yêu cầu</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {order.accessories.map((item: any, idx: number) => {
                          const subTotal = Number(item.quantity || 1) * Number(item.price || 0);

                          return (
                            <tr key={idx} className="hover:bg-secondary/5 transition-colors">
                              <td className="p-3 font-semibold text-foreground">
                                {item.name}
                                <span className="text-[10px] text-muted-foreground block font-normal">Mã SP: {item.productId || item.id}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-foreground">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                {formatCurrency(Number(item.price))}
                              </td>
                              <td className="p-3 text-right font-bold text-foreground">
                                {formatCurrency(subTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar size={13} />
                      <span>Yêu cầu gửi: {formatDate(order.createdAt)}</span>
                    </div>

                    {order.status === "PENDING" && (
                      <div className="flex items-center gap-2 self-end">
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleVehicleReject(order.id)}
                          className="px-3.5 py-2 border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <X size={13} /> Từ chối
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleVehicleApprove(order.id)}
                          className="px-4 py-2 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          {processingId === order.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Duyệt &amp; Trừ Kho
                        </button>
                      </div>
                    )}
                    {order.status === "CANCELLED" && (
                      <p className="text-xs italic text-rose-500 font-medium">Lý do từ chối: {order.reason?.split("| Từ chối:")[1] || "Không được duyệt"}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
