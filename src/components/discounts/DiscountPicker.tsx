"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TicketPercent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/CustomSelect";

export interface DiscountOption {
  id: number;
  code: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  target: "ORDER" | "SERVICE" | "PARTS";
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
}

export function calculateDiscountPreview(
  discount: DiscountOption | null,
  input: { subtotal: number; serviceSubtotal?: number; partsSubtotal?: number },
) {
  if (!discount) return 0;
  const base =
    discount.target === "SERVICE"
      ? Number(input.serviceSubtotal || 0)
      : discount.target === "PARTS"
        ? Number(input.partsSubtotal || 0)
        : Number(input.subtotal || 0);
  let amount =
    discount.discountType === "PERCENTAGE"
      ? Math.round(base * discount.value / 100)
      : discount.value;
  if (discount.maxDiscountAmount !== null) {
    amount = Math.min(amount, discount.maxDiscountAmount);
  }
  return Math.max(0, Math.min(base, input.subtotal, Math.round(amount)));
}

export function DiscountPicker({
  scope,
  value,
  subtotal,
  serviceSubtotal = 0,
  partsSubtotal = 0,
  previewAmountOverride,
  hideContainer = false,
  onChange,
}: {
  scope: "SALES" | "WORKSHOP";
  value: number | null;
  subtotal: number;
  serviceSubtotal?: number;
  partsSubtotal?: number;
  previewAmountOverride?: number;
  hideContainer?: boolean;
  onChange: (discount: DiscountOption | null) => void;
}) {
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMessage("");
    fetch(`/api/discounts?scope=${scope}&activeOnly=true&limit=200`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          if (!response.ok) throw new Error("Không thể kết nối máy chủ để tải mã giảm giá");
        }
        if (!response.ok) throw new Error(data.error || "Không thể tải mã giảm giá");
        if (!controller.signal.aborted) setDiscounts(data.discounts || []);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error(error);
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : "Không thể tải mã giảm giá");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [scope]);

  const selected = useMemo(
    () => discounts.find((discount) => discount.id === value) || null,
    [discounts, value],
  );
  const calculatedAmount = calculateDiscountPreview(selected, {
    subtotal,
    serviceSubtotal,
    partsSubtotal,
  });
  const amount = previewAmountOverride ?? calculatedAmount;
  const eligible = !selected || subtotal >= selected.minOrderAmount;

  const selectOptions = useMemo(() => {
    return [
      { value: "", label: "Không áp dụng mã giảm giá" },
      ...discounts.map((discount) => {
        const isMinMet = subtotal >= discount.minOrderAmount;
        return {
          value: discount.id,
          label: `${discount.code} — ${discount.name}`,
          sublabel:
            discount.discountType === "PERCENTAGE"
              ? `Giảm ${discount.value}%${discount.maxDiscountAmount ? ` (Tối đa ${formatCurrency(discount.maxDiscountAmount)})` : ""}`
              : `Giảm ${formatCurrency(discount.value)}`,
          badge: discount.code,
          badgeVariant: isMinMet ? ("success" as const) : ("danger" as const),
          disabled: !isMinMet,
        };
      }),
    ];
  }, [discounts, subtotal]);

  return (
    <div className={hideContainer ? "space-y-1.5" : "rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"}>
      <div className="flex items-center gap-1.5 h-5">
        <TicketPercent size={14} className="text-primary" />
        <label htmlFor={`discount-picker-${scope}`} className="text-xs font-bold uppercase text-primary tracking-wider">
          Mã giảm giá
        </label>
      </div>
      <div className="relative">
        <CustomSelect
          id={`discount-picker-${scope}`}
          value={value || ""}
          onChange={(val) => {
            const id = Number(val);
            onChange(discounts.find((discount) => discount.id === id) || null);
          }}
          disabled={loading}
          placeholder="Không áp dụng mã giảm giá"
          options={selectOptions}
          clearable
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-primary pointer-events-none"
          />
        )}
      </div>
      {errorMessage && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
          {errorMessage}
        </p>
      )}
      {selected && (
        <div className={`text-xs rounded-xl px-3 py-2 border ${
          eligible
            ? "border-success/20 bg-success/5 text-success"
            : "border-destructive/20 bg-destructive/5 text-destructive"
        }`}>
          {eligible ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">
                {selected.discountType === "PERCENTAGE"
                  ? `Giảm ${selected.value}%`
                  : `Giảm ${formatCurrency(selected.value)}`}
                {selected.target === "SERVICE"
                  ? " tiền công"
                  : selected.target === "PARTS"
                    ? " phụ tùng"
                    : scope === "SALES"
                      ? " giá xe"
                      : " toàn lệnh"}
              </span>
              <span className="font-bold">-{formatCurrency(amount)}</span>
            </div>
          ) : (
            <span className="font-semibold">
              Đơn cần đạt tối thiểu {formatCurrency(selected.minOrderAmount)}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
