import { z } from "zod";

const textOrNull = z.string().trim().max(500).optional().nullable();
const numericValue = z.union([
  z.number().finite().min(0).max(10_000_000_000),
  z.string().trim().regex(/^\d+(\.\d+)?$/, "Giá trị số không hợp lệ"),
  z.literal(""),
]).optional();
const idValue = z.union([z.number().int().positive(), z.string().trim().regex(/^\d+$/), z.null()]).optional();
const itemJson = z
  .union([z.string().max(200_000), z.array(z.record(z.unknown())).max(200)])
  .refine((value) => {
    if (Array.isArray(value) || !value.trim()) return true;
    try {
      return Array.isArray(JSON.parse(value));
    } catch {
      return false;
    }
  }, "Danh sách phụ tùng không đúng định dạng JSON")
  .optional();

export const updateVehicleSchema = z.object({
  vin: z.string().trim().min(1).max(100).optional(),
  sku: textOrNull,
  engineNumber: textOrNull,
  importPrice: numericValue,
  importDate: z.union([z.string().date(), z.literal(""), z.null()]).optional(),
  stockCount: textOrNull,
  branchId: idValue,
  warehouse: textOrNull,
  model: z.string().trim().min(1).max(120).optional(),
  variant: textOrNull,
  color: textOrNull,
  year: numericValue,
  // Cancellation has inventory/debt side effects and must use DELETE /api/sales/[id].
  status: z.enum(["AVAILABLE", "RESERVED", "INCOMING", "SOLD"]).optional(),
  listPrice: numericValue,
  floorPrice: numericValue,
  image: z.string().max(2_000_000).optional().nullable(),
  bankStatus: textOrNull,
  plateStatus: textOrNull,
  plateCost: numericValue,
  accessoriesJson: itemJson,
  giftItemsJson: itemJson,
  notes: z.string().max(10_000).optional().nullable(),
  saleType: z.enum(["RETAIL", "WHOLESALE"]).optional(),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().regex(/^0[0-9]{9}$/).optional(),
  customerBirthday: z.union([z.string().date(), z.literal(""), z.null()]).optional(),
  customerAddress: z.string().trim().max(500).optional().nullable(),
}).strict();

export const createVehicleSchema = updateVehicleSchema;
