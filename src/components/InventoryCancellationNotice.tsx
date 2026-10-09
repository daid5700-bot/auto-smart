import { Ban, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatInventoryCancellationTime, parseInventoryCancellation } from "@/lib/inventory-cancellation-display";

export function InventoryCancellationNotice({ reason, refundedAmount = 0 }: {
  reason?: string | null;
  refundedAmount?: number;
}) {
  const info = parseInventoryCancellation(reason);
  return (
    <section aria-label="Thông tin hủy phiếu" className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs print:break-inside-avoid">
      <details className="group print:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800">
            <Ban size={12} aria-hidden="true" /> Đã hủy
          </span>
          <span className="text-zinc-600">Đã hoàn kho</span>
          {refundedAmount > 0 && <span className="font-medium tabular-nums text-zinc-800">Hoàn tiền: {formatCurrency(refundedAmount)}</span>}
          <span className="ml-auto inline-flex items-center gap-1 text-zinc-600 print:hidden">
            Chi tiết <ChevronDown size={13} className="group-open:rotate-180" aria-hidden="true" />
          </span>
          {info.reason && <span className="basis-full truncate text-zinc-700 group-open:hidden print:hidden" title={info.reason}>Lý do: {info.reason}</span>}
        </summary>
        <dl className="hidden grid-cols-1 gap-x-6 gap-y-2 border-t border-zinc-200 py-3 text-zinc-800 group-open:grid sm:grid-cols-2">
          {info.cancelledBy && (
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-zinc-600">Người hủy</dt>
              <dd className="font-medium break-words min-w-0">{info.cancelledBy}</dd>
            </div>
          )}
          {info.cancelledAt && (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <dt className="text-zinc-600">Thời gian</dt>
              <dd><time dateTime={info.cancelledAt} className="tabular-nums">{formatInventoryCancellationTime(info.cancelledAt)}</time></dd>
            </div>
          )}
          {info.reason && (
            <div className="flex min-w-0 gap-2 sm:col-span-2">
              <dt className="shrink-0 text-zinc-600">Lý do</dt>
              <dd className="break-words min-w-0 whitespace-pre-wrap">{info.reason}</dd>
            </div>
          )}
        </dl>
      </details>
      {/* Print all audit information even when the on-screen disclosure is closed. */}
      <div className="hidden space-y-1 py-3 text-zinc-800 print:block">
        <p className="font-medium">Đã hủy · Đã hoàn kho{refundedAmount > 0 ? ` · Hoàn tiền: ${formatCurrency(refundedAmount)}` : ""}</p>
        {(info.cancelledBy || info.cancelledAt) && <p>{[info.cancelledBy, formatInventoryCancellationTime(info.cancelledAt)].filter(Boolean).join(" · ")}</p>}
        {info.reason && <p className="break-words whitespace-pre-wrap">Lý do: {info.reason}</p>}
      </div>
    </section>
  );
}
