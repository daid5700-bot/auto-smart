"use client";

import { useEffect, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ban, Loader2, X } from "lucide-react";
import { useModal } from "@/components/ModalProvider";
import { useAuth } from "@/lib/store";
import { canCancelInventoryOrder } from "@/lib/inventory-order";
import { formatCurrency } from "@/lib/utils";

type Order = {
  id: number;
  code: string;
  type: string;
  status: string;
  paidAmount: number | string;
  debtAmount: number | string;
  createdBy?: string;
  vehicleId?: number | null;
  movements?: Array<{ relatedRoId?: number | null }>;
};

export function CancelInventoryOrderButton({ order, onCancelled }: {
  order: Order;
  onCancelled: () => void | Promise<void>;
}) {
  const { user, activeBranch } = useAuth();
  const modal = useModal();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const paidAmount = Number(order.paidAmount || 0);
  useEffect(() => { setOpen(false); }, [activeBranch?.id]);

  if (!user || !["ADMIN", "WAREHOUSE"].includes(user.role) || !canCancelInventoryOrder(order)) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!reason.trim()) { setError("Vui lòng nhập lý do hủy phiếu."); return; }
    if (paidAmount > 0 && !refundConfirmed) { setError("Vui lòng xác nhận đã hoàn tiền cho khách."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/inventory/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), refundConfirmed, refundMethod, expectedPaidAmount: paidAmount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể hủy phiếu.");
      setOpen(false);
      await onCancelled();
      await modal.alert({ title: "Hủy phiếu thành công", message: data.message, type: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy phiếu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      if (submitting) return;
      if (nextOpen) { setReason(""); setRefundConfirmed(false); setRefundMethod("CASH"); setError(""); }
      setOpen(nextOpen);
    }}>
      <Dialog.Trigger asChild>
        <button type="button" onClick={(event) => event.stopPropagation()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          aria-label={`Hủy phiếu ${order.code}`}>
          <Ban size={14} aria-hidden="true" /> Hủy phiếu
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content onClick={(event) => event.stopPropagation()}
          onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }}
          onPointerDownOutside={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[1101] max-h-[90vh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <Dialog.Title className="pr-10 text-lg font-bold">Hủy phiếu {order.code}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Hoàn toàn bộ hàng về kho chi nhánh gốc và gỡ công nợ của phiếu. Phiếu vẫn được giữ trong lịch sử, không thể mở lại.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" disabled={submitting} aria-label="Đóng cửa sổ hủy phiếu"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
              <X size={18} />
            </button>
          </Dialog.Close>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="rounded-xl bg-secondary/40 p-3 text-sm space-y-1">
              <p>Công nợ được gỡ: <strong>{formatCurrency(Number(order.debtAmount || 0))}</strong></p>
              <p>Tiền cần hoàn: <strong>{formatCurrency(paidAmount)}</strong></p>
            </div>
            <div>
              <label htmlFor={reasonId} className="block text-sm font-semibold mb-1.5">Lý do hủy *</label>
              <textarea id={reasonId} required maxLength={500} rows={3} disabled={submitting}
                value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }}
                aria-describedby={error ? `${reasonId}-error` : undefined}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ví dụ: Khách không lấy hàng nữa" />
            </div>
            {paidAmount > 0 && (
              <>
                <label className="block text-sm font-semibold">
                  Hình thức hoàn tiền
                  <select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as typeof refundMethod)} disabled={submitting}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 font-normal focus:ring-2 focus:ring-primary/30">
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input type="checkbox" checked={refundConfirmed} disabled={submitting}
                    onChange={(event) => { setRefundConfirmed(event.target.checked); setError(""); }} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
                  <span>Tôi đã hoàn {formatCurrency(paidAmount)} cho khách. Hệ thống chỉ ghi nhận phiếu chi, không tự chuyển tiền.</span>
                </label>
              </>
            )}
            {error && <p id={`${reasonId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Dialog.Close asChild>
                <button type="button" disabled={submitting} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-secondary">Quay lại</button>
              </Dialog.Close>
              <button type="submit" disabled={submitting || !reason.trim() || (paidAmount > 0 && !refundConfirmed)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {submitting ? "Đang hủy…" : "Xác nhận hủy"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
