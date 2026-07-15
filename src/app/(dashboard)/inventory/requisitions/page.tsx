"use client";
import { useEffect, useState, useMemo } from "react";
import { ClipboardList, Check, X, Eye, AlertCircle, Loader2, Calendar, Car, User, Settings, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, fetchWithDedup } from "@/lib/utils";
import { useModal } from "@/components/ModalProvider";


export default function UnifiedRequisitionsApprovalPage() {
  const modal = useModal();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [vehicleOrders, setVehicleOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState<"WORKSHOP" | "VEHICLE">("WORKSHOP");
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d1, d2] = await Promise.all([
        fetchWithDedup("/api/workshop/requisitions"),
        fetchWithDedup("/api/inventory/pending-exports?status=ALL")
      ]);
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
    const confirmed = await modal.confirm({
      title: "Phê duyệt yêu cầu xuất kho",
      message: "Bạn có chắc chắn muốn duyệt xuất kho cho yêu cầu sửa chữa này?",
      type: "success",
      confirmText: "Duyệt ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi duyệt yêu cầu.");
      await modal.alert({
        title: "Thành công",
        message: "Đã duyệt xuất phụ tùng thành công. Kho đã trừ hàng.",
        type: "success",
      });
      fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Thất bại",
        message: e.message || "Gặp lỗi khi duyệt yêu cầu.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleWorkshopReject = async (id: number) => {
    const confirmed = await modal.confirm({
      title: "Từ chối yêu cầu xuất kho",
      message: "Bạn có chắc chắn muốn từ chối yêu cầu xuất kho này?",
      type: "danger",
      confirmText: "Từ chối",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/workshop/requisitions/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gặp lỗi khi từ chối.");
      await modal.alert({
        title: "Thành công",
        message: "Đã từ chối yêu cầu xuất kho sửa chữa.",
        type: "success",
      });
      fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Thất bại",
        message: e.message || "Gặp lỗi khi từ chối.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Vehicle accessories approval handlers (handles both paid and gifts grouped together)
  const handleVehicleGroupApprove = async (card: any) => {
    const confirmed = await modal.confirm({
      title: "Duyệt xuất kho phụ kiện",
      message: "Bạn có chắc chắn muốn duyệt xuất kho cho phụ kiện kèm xe này? Tồn kho sẽ trừ ngay.",
      type: "success",
      confirmText: "Duyệt ngay",
      cancelText: "Hủy",
    });
    if (!confirmed) return;
    const processId = card.paidOrderId || card.giftRequisitionId;
    if (!processId) return;
    setProcessingId(processId);
    try {
      if (card.paidOrderId) {
        const res = await fetch(`/api/inventory/pending-exports/${card.paidOrderId}/approve`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gặp lỗi khi duyệt phụ kiện mua kèm.");
      }
      if (card.giftRequisitionId) {
        const res = await fetch(`/api/workshop/requisitions/${card.giftRequisitionId}/approve`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gặp lỗi khi duyệt quà tặng phụ tùng.");
      }
      await modal.alert({
        title: "Thành công",
        message: "Đã duyệt xuất phụ kiện kèm xe thành công.",
        type: "success",
      });
      fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Thất bại",
        message: e.message || "Gặp lỗi khi duyệt phụ kiện.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleVehicleGroupReject = async (card: any) => {
    const reason = prompt("Nhập lý do từ chối yêu cầu xuất kho:");
    if (reason === null) return;
    const processId = card.paidOrderId || card.giftRequisitionId;
    if (!processId) return;
    setProcessingId(processId);
    try {
      if (card.paidOrderId) {
        const res = await fetch(`/api/inventory/pending-exports/${card.paidOrderId}/approve`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || "Không đủ hàng tồn kho" })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gặp lỗi khi từ chối phụ kiện mua kèm.");
      }
      if (card.giftRequisitionId) {
        const res = await fetch(`/api/workshop/requisitions/${card.giftRequisitionId}/reject`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gặp lỗi khi từ chối quà tặng.");
      }
      await modal.alert({
        title: "Thành công",
        message: "Đã từ chối yêu cầu xuất phụ kiện kèm xe.",
        type: "success",
      });
      fetchData();
    } catch (e: any) {
      await modal.alert({
        title: "Thất bại",
        message: e.message || "Gặp lỗi khi từ chối.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtration logic
  // 1. Workshop tab: Only requisitions that belong to a Repair Order (repairOrderId is not null)
  const workshopReqs = useMemo(() => {
    return requisitions.filter(r => r.repairOrderId !== null);
  }, [requisitions]);

  const pendingWorkshop = useMemo(() => {
    return workshopReqs.filter((r) => r.status === "PENDING");
  }, [workshopReqs]);

  const historyWorkshop = useMemo(() => {
    return workshopReqs.filter((r) => r.status !== "PENDING");
  }, [workshopReqs]);

  // 2. Vehicle Accessories tab: Merge Paid Accessories (from vehicleOrders) and Free Gift Accessories (from requisitions where vehicleId is not null)
  const normalizedVehicleItems = useMemo(() => {
    const paidItems = vehicleOrders.map(o => {
      const customer = o.customer || {};
      const vehicle = o.vehicle || {};
      return {
        id: o.id,
        isGift: false,
        code: o.code,
        status: o.status, // PENDING, PAID, CANCELLED
        createdAt: o.createdAt,
        customerName: customer.name || "Khách vãng lai",
        customerPhone: customer.phone || "",
        vehicleModel: vehicle.model || "N/A",
        vehicleVin: vehicle.vin || "",
        totalAmount: o.totalAmount,
        reason: o.reason,
        branch: o.branch,
        items: (o.accessories || []).map((acc: any) => ({
          name: acc.name,
          sku: acc.productId || acc.id,
          quantity: acc.quantity,
          price: acc.price,
          subTotal: Number(acc.quantity || 1) * Number(acc.price || 0),
          isGift: false,
          stockCount: Number(acc.stockCount || 0)
        }))
      };
    });

    const giftReqs = requisitions.filter(r => r.vehicleId !== null).map(r => {
      const vehicle = r.vehicle || {};
      const customer = vehicle.customer || {};
      const totalBill = r.items.reduce((s: number, item: any) => {
        const prod = item.product || {};
        const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
        return s + Number(item.quantity) * Number(priceVal);
      }, 0);

      let statusStr = "PENDING";
      if (r.status === "APPROVED") statusStr = "PAID";
      else if (r.status === "REJECTED") statusStr = "CANCELLED";

      return {
        id: r.id,
        isGift: true,
        code: `YCT-GIFT-${r.id}`,
        status: statusStr,
        createdAt: r.createdAt,
        customerName: customer.name || "Khách mua xe",
        customerPhone: customer.phone || "",
        vehicleModel: vehicle.model || "N/A",
        vehicleVin: vehicle.vin || "",
        totalAmount: totalBill, // For UI audit
        reason: r.reason || "Tặng phụ kiện kèm xe",
        branch: r.branch,
        items: r.items.map((it: any) => {
          const prod = it.product || {};
          const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
          return {
            name: prod.name || "Sản phẩm không rõ",
            sku: prod.sku || "MÃ-PT",
            quantity: it.quantity,
            price: priceVal,
            subTotal: it.quantity * priceVal,
            isGift: true,
            stockCount: Number(prod.stockCount || 0)
          };
        })
      };
    });

    // Group items by vehicleVin (if present)
    const grouped = new Map<string, any>();
    
    // Process paidItems
    paidItems.forEach(item => {
      if (item.vehicleVin) {
        grouped.set(item.vehicleVin, {
          ...item,
          paidOrderId: item.id,
          paidOrderCode: item.code,
          giftRequisitionId: null,
          giftRequisitionCode: null,
          hasPaid: true,
          hasGift: false,
          giftValue: 0,
          branch: item.branch,
          giftBranch: null
        });
      } else {
        grouped.set(`NO-VIN-${item.id}`, {
          ...item,
          paidOrderId: item.id,
          paidOrderCode: item.code,
          giftRequisitionId: null,
          giftRequisitionCode: null,
          hasPaid: true,
          hasGift: false,
          giftValue: 0,
          branch: item.branch,
          giftBranch: null
        });
      }
    });

    // Process giftReqs
    giftReqs.forEach(item => {
      if (item.vehicleVin) {
        const existing = grouped.get(item.vehicleVin);
        if (existing) {
          existing.giftRequisitionId = item.id;
          existing.giftRequisitionCode = item.code;
          existing.hasGift = true;
          existing.giftValue = item.totalAmount;
          // Combine item list
          existing.items = [...existing.items, ...item.items];
          // Store gift branch
          existing.giftBranch = item.branch;
          
          // Determine status: if either is PENDING, overall is PENDING.
          // Otherwise, if both are CANCELLED, overall is CANCELLED.
          // Otherwise, overall is PAID.
          if (item.status === "PENDING" || existing.status === "PENDING") {
            existing.status = "PENDING";
          } else if (item.status === "CANCELLED" && existing.status === "CANCELLED") {
            existing.status = "CANCELLED";
          } else {
            existing.status = "PAID";
          }
        } else {
          // If no paid order, create a card with only gift items
          grouped.set(item.vehicleVin, {
            ...item,
            paidOrderId: null,
            paidOrderCode: null,
            giftRequisitionId: item.id,
            giftRequisitionCode: item.code,
            hasPaid: false,
            hasGift: true,
            giftValue: item.totalAmount,
            branch: null,
            giftBranch: item.branch
          });
        }
      } else {
        grouped.set(`NO-VIN-GIFT-${item.id}`, {
          ...item,
          paidOrderId: null,
          paidOrderCode: null,
          giftRequisitionId: item.id,
          giftRequisitionCode: item.code,
          hasPaid: false,
          hasGift: true,
          giftValue: item.totalAmount,
          branch: null,
          giftBranch: item.branch
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [vehicleOrders, requisitions]);

  const pendingVehicle = useMemo(() => {
    return normalizedVehicleItems.filter((o) => o.status === "PENDING");
  }, [normalizedVehicleItems]);

  const historyVehicle = useMemo(() => {
    return normalizedVehicleItems.filter((o) => o.status !== "PENDING");
  }, [normalizedVehicleItems]);

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
      {/* Header section with tab bars on a single row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        {/* Pending/History Toggle */}
        <div className="flex items-center bg-secondary/35 border border-border p-1 rounded-xl shrink-0">
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

        {/* Source tab selector: Workshop vs Vehicle Accessories */}
        <div className="flex items-center gap-2">
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
              const ro = req.repairOrder;
              const vehicle = req.vehicle;
              const cust = ro?.customer || vehicle?.customer || {};
              const totalBill = req.items.reduce((s: number, item: any) => {
                const prod = item.product || {};
                const priceVal = prod.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0;
                return s + Number(item.quantity) * Number(priceVal);
              }, 0);

              const isGift = !!vehicle;

              return (
                <div key={req.id} className="glass-card rounded-2xl p-5 border border-border/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-3 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{isGift ? "TẶNG PHỤ TÙNG (BÁN LẺ)" : "MÃ LỆNH SỬA CHỮA"}</span>
                      <h3 className="text-base font-black tracking-tight text-foreground">
                        {isGift ? `SALE-${vehicle.id}` : `RO-${ro?.id || "CHƯA RÕ"}`}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-bold text-foreground">{cust.name || "Khách vãng lai"}</span>
                        {cust.phone && ` · ${cust.phone}`}
                        {(ro?.plateNumber || vehicle?.vin) && ` · Xe ${ro?.plateNumber || vehicle?.model}`}
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
                        <p className="font-semibold text-foreground">{isGift ? "NHÂN VIÊN BÁN" : "KTV PHỤ TRÁCH"}</p>
                        <p className="font-medium text-primary">{isGift ? "Hệ thống" : (ro?.technician?.name || "Chưa giao việc")}</p>
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
                      {ro && ro.id && (
                        <Link
                          href={`/workshop?id=${ro.id}`}
                          className="px-3.5 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Eye size={13} /> Xem chi tiết lệnh
                        </Link>
                      )}

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
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
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
              const statusColors: any = {
                PENDING: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                PAID: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
                CANCELLED: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
              };

              const uniqueKey = order.vehicleVin ? `group-${order.vehicleVin}` : `group-no-vin-${order.paidOrderId || order.giftRequisitionId}`;
              return (
                <div key={uniqueKey} className="glass-card rounded-2xl p-5 border border-border/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full font-mono font-bold text-muted-foreground">
                          {order.paidOrderCode && order.giftRequisitionCode
                            ? `${order.paidOrderCode} & ${order.giftRequisitionCode}`
                            : (order.paidOrderCode || order.giftRequisitionCode)}
                        </span>
                        {order.hasPaid && (
                          <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">Tính tiền</span>
                        )}
                        {order.hasGift && (
                          <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full">Quà tặng (0đ)</span>
                        )}
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                          {order.status === "PENDING" ? "Chờ duyệt" : order.status === "PAID" ? "Đã duyệt xuất" : "Đã từ chối"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User size={13}/> <strong>Khách hàng:</strong> {order.customerName} ({order.customerPhone || "N/A"})</span>
                        {order.vehicleVin && (
                          <span className="flex items-center gap-1"><Car size={13}/> <strong>Xe VIN:</strong> {order.vehicleModel} ({order.vehicleVin.slice(-6)})</span>
                        )}
                        {order.branch && (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/10">
                            Cơ sở xuất: {order.branch.name} ({order.branch.code})
                          </span>
                        )}
                        {order.giftBranch && (!order.branch || order.giftBranch.id !== order.branch.id) && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
                            Cơ sở quà tặng: {order.giftBranch.name} ({order.giftBranch.code})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Giá trị phụ kiện</p>
                      <div className="flex flex-col items-end">
                        {order.hasPaid && (
                          <p className="text-sm font-black text-primary">{formatCurrency(order.totalAmount)}</p>
                        )}
                        {order.hasGift && (
                          <p className="text-[10px] font-bold text-emerald-600">Quà tặng: {formatCurrency(order.giftValue)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/15 text-muted-foreground font-semibold">
                          <th className="p-3">Mã &amp; Tên Phụ Tùng</th>
                          <th className="p-3 text-center">Số lượng yêu cầu</th>
                          <th className="p-3 text-center bg-secondary/5">Tồn hiện tại</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {order.items.map((item: any, idx: number) => {
                          const isOut = item.stockCount < item.quantity;
                          return (
                            <tr key={idx} className="hover:bg-secondary/5 transition-colors">
                              <td className="p-3 font-semibold text-foreground">
                                {item.name}
                                <span className="text-[10px] text-muted-foreground block font-normal">Mã SP: {item.sku}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-foreground">
                                {item.quantity} cái
                              </td>
                              <td className={`p-3 text-center font-bold bg-secondary/5 ${isOut && order.status === "PENDING" ? "text-rose-600" : "text-foreground"}`}>
                                {item.stockCount} cái {isOut && order.status === "PENDING" && <span className="text-[9px] font-medium block text-rose-500 font-normal mt-0.5">(Không đủ tồn)</span>}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                {item.isGift ? (
                                  <div className="text-right">
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded font-bold">Quà tặng (0đ)</span>
                                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">({formatCurrency(Number(item.price))})</span>
                                  </div>
                                ) : (
                                  formatCurrency(Number(item.price))
                                )}
                              </td>
                              <td className="p-3 text-right font-bold text-foreground">
                                {item.isGift ? "0 đ" : formatCurrency(item.subTotal)}
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
                          onClick={() => handleVehicleGroupReject(order)}
                          className="px-3.5 py-2 border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <X size={13} /> Từ chối
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleVehicleGroupApprove(order)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          {processingId === (order.paidOrderId || order.giftRequisitionId) ? (
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
