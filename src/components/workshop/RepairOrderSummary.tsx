import { Loader2, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  totalServiceCost: number;
  serviceDiscountPercent: number | "";
  serviceDiscountAmount: number;
  partsCostTotal: number;
  partsDiscountPercent: number | "";
  partsDiscountAmount: number;
  selectedCustomerId: number | null;
  customerLoyaltyPoints: number;
  pointsToRedeem: number | "";
  onPointsToRedeemChange: (value: number | "") => void;
  subtotal: number;
  totalDiscountAmount: number;
  pointsDiscountAmount: number;
  finalTotal: number;
  itemLineCount: number;
  totalPartsQuantity: number;
  submitting: boolean;
  onCancel: () => void;
};

export function RepairOrderSummary(props: Props) {
  const maxRedeemablePoints = Math.min(
    props.customerLoyaltyPoints,
    Math.max(0, Math.floor((props.subtotal - props.totalDiscountAmount) / 1000)),
  );

  return (
    <div className="glass-card rounded-2xl p-5 space-y-6 border-l-4 border-l-primary flex flex-col justify-between min-h-[300px]">
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">TÓM TẮT BÁO GIÁ</p>
          <h3 className="text-base font-bold tracking-tight mt-0.5">Báo giá sơ bộ (ước tính)</h3>
        </div>

        <div className="space-y-3.5 pt-4 border-t border-border/40">
          <SummaryRow label="Tiền công thợ:" value={formatCurrency(props.totalServiceCost)} />
          {props.serviceDiscountAmount > 0 && (
            <DiscountRow
              label={`Giảm giá công thợ (${props.serviceDiscountPercent}%):`}
              amount={props.serviceDiscountAmount}
            />
          )}
          <SummaryRow label="Tiền phụ tùng:" value={formatCurrency(props.partsCostTotal)} />
          {props.partsDiscountAmount > 0 && (
            <DiscountRow
              label={`Giảm giá phụ tùng (${props.partsDiscountPercent}%):`}
              amount={props.partsDiscountAmount}
            />
          )}

          {props.selectedCustomerId && props.customerLoyaltyPoints > 0 ? (
            <div className="pt-3 border-t border-dashed border-border/40 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Điểm tích lũy hiện có:</span>
                <span className="font-bold text-amber-600">
                  {props.customerLoyaltyPoints} điểm ({formatCurrency(props.customerLoyaltyPoints * 1000)})
                </span>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase">Quy đổi điểm giảm giá</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={props.pointsToRedeem}
                    onChange={(event) => {
                      const cleanValue = event.target.value.replace(/\D/g, "");
                      if (!cleanValue) return props.onPointsToRedeemChange("");
                      const value = Math.min(maxRedeemablePoints, parseInt(cleanValue, 10));
                      props.onPointsToRedeemChange(value > 0 ? value : "");
                    }}
                    className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary font-bold text-primary"
                    placeholder={`Tối đa: ${maxRedeemablePoints}`}
                  />
                  <span className="absolute right-2 text-[10px] font-bold text-muted-foreground">Điểm</span>
                </div>
              </div>
              {Number(props.pointsToRedeem) > 0 && (
                <div className="flex items-center justify-between text-xs text-success bg-success/5 border border-success/15 p-2 rounded-lg">
                  <span className="font-semibold">Chiết khấu đổi điểm:</span>
                  <span className="font-bold">-{formatCurrency(props.pointsDiscountAmount)}</span>
                </div>
              )}
            </div>
          ) : null}

          {props.totalDiscountAmount + props.pointsDiscountAmount > 0 && (
            <div className="pt-2.5 border-t border-dashed border-border/40 flex items-center justify-between text-[11px] font-bold text-destructive">
              <span>Tổng tiền được giảm:</span>
              <span>-{formatCurrency(props.totalDiscountAmount + props.pointsDiscountAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-dashed border-border/40 font-bold">
            <span className="text-xs text-muted-foreground">Tổng thanh toán:</span>
            <span className="text-lg font-black text-primary tracking-tight">{formatCurrency(props.finalTotal)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border/40 pt-4 mt-4 text-[11px] text-muted-foreground/80">
        <SummaryRow label="Số dòng phụ tùng:" value={`${props.itemLineCount} dòng`} />
        <SummaryRow label="Tổng đơn vị phụ tùng:" value={`${props.totalPartsQuantity} đơn vị`} />
      </div>

      <div className="flex items-center gap-3 pt-6 border-t border-border/40">
        <button type="button" onClick={props.onCancel} className="flex-1 px-4 py-2.5 border border-border hover:bg-secondary/40 rounded-xl text-xs font-semibold transition-colors text-center">
          Hủy
        </button>
        <button type="submit" disabled={props.submitting} className="flex-1 gradient-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition-all">
          {props.submitting ? <Loader2 size={13} className="animate-spin" /> : <><Sparkles size={13} /> Lưu lệnh</>}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function DiscountRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-destructive bg-destructive/5 border border-destructive/15 px-2.5 py-1.5 rounded-lg">
      <span className="font-semibold">{label}</span>
      <span className="font-bold">-{formatCurrency(amount)}</span>
    </div>
  );
}
