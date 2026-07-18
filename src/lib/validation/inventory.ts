import { z } from "zod";

export const createInventoryOrderSchema = z.object({
  customerId: z.coerce.number().int().positive().optional().nullable(),
  phone: z.string().trim().regex(/^0[0-9]{9}$/).optional(),
  customerName: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().max(500).optional().nullable(),
  type: z.enum(["EXPORT_RETAIL", "EXPORT_WHOLESALE", "INTERNAL"]).default("EXPORT_RETAIL"),
  reason: z.string().trim().max(2_000).optional().nullable(),
  paidAmount: z.coerce.number().finite().min(0).max(10_000_000_000).default(0),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().finite().positive().max(1_000_000),
    unitPrice: z.coerce.number().finite().min(0).max(10_000_000_000),
  }).strict()).min(1).max(500),
}).strict().superRefine((value, context) => {
  if (value.type !== "INTERNAL" && !value.customerId && (!value.phone || !value.customerName)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerId"],
      message: "Vui lòng chọn khách hàng hoặc nhập tên và số điện thoại khách hàng mới",
    });
  }
});
