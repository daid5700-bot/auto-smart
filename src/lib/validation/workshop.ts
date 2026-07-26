import { z } from "zod";

const optionalPositiveId = z.coerce.number().int().positive().optional().nullable();
const money = z.coerce.number().finite().min(0).max(10_000_000_000);

export const requisitionItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().finite().positive().max(100_000),
  // Kept for backward-compatible clients. The server ignores this value and
  // resolves the current RETAIL price from the product catalogue.
  unitPrice: money.optional(),
}).strict();

export const workshopServiceLineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  cost: money,
}).strict();

export const createWorkshopWithRequisitionSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^0[0-9]{9}$/, "Số điện thoại không hợp lệ"),
  plateNumber: z.string().trim().min(1).max(30),
  vehicleModel: z.string().trim().max(120).optional().nullable(),
  kmIn: z.coerce.number().int().min(0).max(10_000_000).default(0),
  symptoms: z.string().max(10_000).optional().nullable(),
  carCondition: z.string().max(5_000).optional().nullable(),
  technicianId: optionalPositiveId,
  // Kept for backward compatibility only. The authoritative total is the sum
  // of services[].cost.
  laborCost: money.default(0),
  services: z.array(workshopServiceLineSchema).min(1).max(100),
  items: z.array(requisitionItemSchema).max(200).default([]),
  pointsToRedeem: z.coerce.number().int().min(0).max(10_000_000).default(0),
  discountPercent: z.coerce.number().refine((value) => value === 0, {
    message: "Lệnh mới chỉ được giảm giá bằng mã giảm giá.",
  }).default(0),
  discountCodeId: optionalPositiveId,
  birthday: z.union([z.string().date(), z.literal("")]).optional(),
}).strict();

// Keep the route-facing name explicit while retaining the shorter export for
// other callers that may already import it.
export const createRepairOrderWithRequisitionSchema = createWorkshopWithRequisitionSchema;

export function parseServiceDiscounts(symptoms: string | null | undefined) {
  if (!symptoms) return { serviceDiscountPercent: 0, partsDiscountPercent: 0 };

  try {
    const parsed = JSON.parse(symptoms);
    const clampPercent = (value: unknown) =>
      Math.min(100, Math.max(0, Number(value) || 0));

    return {
      serviceDiscountPercent: clampPercent(parsed?.serviceDiscountPercent),
      partsDiscountPercent: clampPercent(parsed?.partsDiscountPercent),
    };
  } catch {
    return { serviceDiscountPercent: 0, partsDiscountPercent: 0 };
  }
}

export const createInlineRepairOrderSchema = z.object({
  customerId: optionalPositiveId,
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().regex(/^0[0-9]{9}$/).optional(),
  plateNumber: z.string().trim().min(1).max(30),
  vehicleModel: z.string().trim().max(120).optional().nullable(),
  kmIn: z.coerce.number().int().min(0).max(10_000_000).default(0),
  symptoms: z.string().max(10_000).optional().nullable(),
  photos: z.array(z.string().max(500)).max(20).default([]),
  status: z.enum(["PENDING", "DIAGNOSING", "DOING", "WAITING_PARTS"]).default("DOING"),
  technicianId: optionalPositiveId,
  laborCost: money.default(0),
  partsCost: money.default(0),
  discountCodeId: optionalPositiveId,
}).strict();
