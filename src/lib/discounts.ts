import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-response";

export const DISCOUNT_SCOPES = ["SALES", "WORKSHOP"] as const;
export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"] as const;
export const DISCOUNT_TARGETS = ["ORDER", "SERVICE", "PARTS"] as const;

export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export type DiscountTarget = (typeof DISCOUNT_TARGETS)[number];

type TransactionClient = Prisma.TransactionClient;

export interface DiscountCalculationInput {
  subtotal: number;
  serviceSubtotal?: number;
  partsSubtotal?: number;
}

export interface AppliedDiscount {
  id: number;
  code: string;
  name: string;
  scope: DiscountScope;
  discountType: DiscountType;
  target: DiscountTarget;
  value: number;
  maxDiscountAmount: number | null;
  amount: number;
}

function clampMoney(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export function calculateDiscountAmount(
  discount: {
    discountType: string | null;
    target: string | null;
    value: number;
    maxDiscountAmount?: number | null;
  },
  input: DiscountCalculationInput,
) {
  const subtotal = clampMoney(input.subtotal);
  const target = (discount.target || "ORDER") as DiscountTarget;
  const baseAmount =
    target === "SERVICE"
      ? clampMoney(input.serviceSubtotal || 0)
      : target === "PARTS"
        ? clampMoney(input.partsSubtotal || 0)
        : subtotal;

  let amount =
    discount.discountType === "PERCENTAGE"
      ? Math.round(baseAmount * (Math.max(0, discount.value) / 100))
      : Math.round(Math.max(0, discount.value));

  // A zero cap is legacy data for "unlimited". Only percentage discounts can
  // have a meaningful positive maximum discount amount.
  if (
    discount.discountType === "PERCENTAGE" &&
    Number(discount.maxDiscountAmount) > 0
  ) {
    amount = Math.min(amount, clampMoney(Number(discount.maxDiscountAmount)));
  }

  return Math.min(baseAmount, subtotal, Math.max(0, amount));
}

export function calculateSnapshotDiscount(
  snapshot: {
    appliedDiscountType?: string | null;
    appliedDiscountTarget?: string | null;
    appliedDiscountValue?: Prisma.Decimal | number | null;
    appliedDiscountMaxAmount?: Prisma.Decimal | number | null;
  },
  input: DiscountCalculationInput,
) {
  if (!snapshot.appliedDiscountType || snapshot.appliedDiscountType === "LEGACY") {
    return null;
  }

  return calculateDiscountAmount(
    {
      discountType: snapshot.appliedDiscountType,
      target: snapshot.appliedDiscountTarget || "ORDER",
      value: Number(snapshot.appliedDiscountValue || 0),
      maxDiscountAmount:
        snapshot.appliedDiscountMaxAmount === null
          ? null
          : Number(snapshot.appliedDiscountMaxAmount),
    },
    input,
  );
}

export async function applyDiscountCode(
  tx: TransactionClient,
  options: {
    discountCodeId: number;
    branchId: number;
    scope: DiscountScope;
    subtotal: number;
    serviceSubtotal?: number;
    partsSubtotal?: number;
    incrementUsage?: boolean;
  },
): Promise<AppliedDiscount> {
  await tx.$queryRaw`SELECT "id" FROM "DiscountCode" WHERE "id" = ${options.discountCodeId} FOR UPDATE`;

  const discount = await tx.discountCode.findUnique({
    where: { id: options.discountCodeId },
  });

  if (!discount || discount.branchId !== options.branchId || discount.scope !== options.scope) {
    throw new ApiError("Mã giảm giá không tồn tại tại cơ sở hiện tại.", 400, "DISCOUNT_NOT_FOUND");
  }

  const now = new Date();
  if (!discount.isActive) {
    throw new ApiError("Mã giảm giá đã ngừng hoạt động.", 400, "DISCOUNT_INACTIVE");
  }
  if (discount.startsAt && discount.startsAt > now) {
    throw new ApiError("Mã giảm giá chưa đến thời gian áp dụng.", 400, "DISCOUNT_NOT_STARTED");
  }
  if (discount.endsAt && discount.endsAt < now) {
    throw new ApiError("Mã giảm giá đã hết hạn.", 400, "DISCOUNT_EXPIRED");
  }
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
    throw new ApiError("Mã giảm giá đã hết lượt sử dụng.", 400, "DISCOUNT_LIMIT_REACHED");
  }

  const subtotal = clampMoney(options.subtotal);
  if (subtotal < Number(discount.minOrderAmount || 0)) {
    throw new ApiError(
      `Đơn hàng phải đạt tối thiểu ${Number(discount.minOrderAmount).toLocaleString("vi-VN")}đ để áp dụng mã này.`,
      400,
      "DISCOUNT_MIN_ORDER",
    );
  }

  if (options.scope === "SALES" && discount.target !== "ORDER") {
    throw new ApiError("Mã giảm giá bán xe chỉ được áp dụng trên giá xe.", 400, "DISCOUNT_TARGET_INVALID");
  }

  const amount = calculateDiscountAmount(
    {
      discountType: discount.discountType,
      target: discount.target,
      value: Number(discount.value),
      maxDiscountAmount: discount.maxDiscountAmount === null
        ? null
        : Number(discount.maxDiscountAmount),
    },
    options,
  );

  if (amount <= 0) {
    throw new ApiError("Mã giảm giá không tạo ra giá trị giảm hợp lệ.", 400, "DISCOUNT_ZERO_VALUE");
  }

  if (options.incrementUsage !== false) {
    await tx.discountCode.update({
      where: { id: discount.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  return {
    id: discount.id,
    code: discount.code,
    name: discount.name,
    scope: discount.scope as DiscountScope,
    discountType: discount.discountType as DiscountType,
    target: discount.target as DiscountTarget,
    value: Number(discount.value),
    maxDiscountAmount:
      discount.maxDiscountAmount === null ? null : Number(discount.maxDiscountAmount),
    amount,
  };
}

export function discountSnapshotData(discount: AppliedDiscount | null) {
  return discount
    ? {
        discountCodeId: discount.id,
        appliedDiscountCode: discount.code,
        appliedDiscountName: discount.name,
        appliedDiscountType: discount.discountType,
        appliedDiscountValue: discount.value,
        appliedDiscountMaxAmount: discount.maxDiscountAmount,
        appliedDiscountTarget: discount.target,
        discountAmount: discount.amount,
      }
    : {
        discountCodeId: null,
        appliedDiscountCode: null,
        appliedDiscountName: null,
        appliedDiscountType: null,
        appliedDiscountValue: 0,
        appliedDiscountMaxAmount: null,
        appliedDiscountTarget: null,
        discountAmount: 0,
      };
}
