import { z } from "zod";

const optionalMoney = z.union([
  z.coerce.number().finite().min(0).max(10_000_000_000),
  z.literal(""),
  z.null(),
]).optional();

export const discountQuerySchema = z.object({
  scope: z.enum(["SALES", "WORKSHOP"]),
  activeOnly: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  search: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const discountFields = {
  code: z.string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ được chứa chữ, số, dấu gạch ngang hoặc gạch dưới.")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  scope: z.enum(["SALES", "WORKSHOP"]),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  target: z.enum(["ORDER", "SERVICE", "PARTS"]).default("ORDER"),
  value: z.coerce.number().finite().positive().max(10_000_000_000),
  maxDiscountAmount: optionalMoney,
  minOrderAmount: z.coerce.number().finite().min(0).max(10_000_000_000).default(0),
  usageLimit: z.union([z.coerce.number().int().positive().max(10_000_000), z.literal(""), z.null()]).optional(),
  startsAt: z.union([z.string().datetime(), z.string().date(), z.literal(""), z.null()]).optional(),
  endsAt: z.union([z.string().datetime(), z.string().date(), z.literal(""), z.null()]).optional(),
  isActive: z.boolean().default(true),
};

function validateDiscountDatesAndValue(
  data: Partial<z.infer<z.ZodObject<typeof discountFields>>>,
  ctx: z.RefinementCtx,
) {
  if (data.discountType === "PERCENTAGE" && data.value !== undefined && data.value > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Giảm theo phần trăm không được vượt quá 100%." });
  }
  if (data.scope === "SALES" && data.target !== "ORDER") {
    ctx.addIssue({ code: "custom", path: ["target"], message: "Giảm giá bán xe chỉ áp dụng trên giá xe." });
  }
  if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
}

const discountBaseSchema = z.object(discountFields).strict();

export const discountInputSchema = discountBaseSchema.superRefine(validateDiscountDatesAndValue);
export const discountUpdateSchema = discountBaseSchema.partial().strict().superRefine(validateDiscountDatesAndValue);
