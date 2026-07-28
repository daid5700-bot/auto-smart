import { z } from "zod";

const money = z.coerce
  .number()
  .finite()
  .min(0, "Số tiền không được âm.")
  .max(10_000_000_000, "Số tiền vượt quá giới hạn cho phép.");

const profitMoney = z.coerce
  .number()
  .finite()
  .min(-10_000_000_000, "Lợi nhuận âm vượt quá giới hạn cho phép.")
  .max(10_000_000_000, "Lợi nhuận vượt quá giới hạn cho phép.");

const nullableProductId = z.union([
  z.coerce.number().int().positive(),
  z.null(),
]);

const plateServiceShape = {
  registrationNumber: z.string().trim().max(100).optional().default(""),
  dossierCode: z.string().trim().max(100).optional().default(""),
  portalPassword: z.string().max(200).optional().default(""),
  plateNumber: z.string().trim().max(30).optional().nullable(),
  totalRevenue: money,
  registrationTax: money,
  plateFee: money,
  policeFee: money,
  profit: profitMoney,
  plateFrameProductId: nullableProductId.optional(),
  plateFrameQuantity: z.coerce.number().int().min(0).max(100).default(0),
  status: z
    .enum([
      "TAX_SUBMITTED",
      "DECLARED",
      "PLATE_ISSUED",
      "DOCUMENTS_READY",
      "DELIVERED_TO_CUSTOMER",
      "RETURNED_AFTER_TAX",
    ])
    .default("TAX_SUBMITTED"),
  notes: z.string().trim().max(5_000).optional().nullable(),
};

function validatePlateFrameSelection(
  value: {
    plateFrameProductId?: number | null;
    plateFrameQuantity?: number;
  },
  context: z.RefinementCtx,
) {
  if (value.plateFrameProductId && (value.plateFrameQuantity ?? 0) < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["plateFrameQuantity"],
      message: "Số lượng ốp biển phải lớn hơn 0.",
    });
  }
  if (!value.plateFrameProductId && (value.plateFrameQuantity ?? 0) > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["plateFrameProductId"],
      message: "Vui lòng chọn phụ tùng ốp biển.",
    });
  }
}

export const createPlateServiceSchema = z.object({
    ...plateServiceShape,
    vehicleId: z.coerce.number().int().positive("Vui lòng chọn hồ sơ bán xe."),
    portalPassword: z.string().max(200).optional().default(""),
  }).strict()
  .superRefine(validatePlateFrameSelection);

export const updatePlateServiceSchema = z
  .object(plateServiceShape)
  .partial()
  .strict()
  .superRefine(validatePlateFrameSelection);
