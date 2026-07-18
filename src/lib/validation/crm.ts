import { z } from "zod";

const optionalText = z.string().trim().max(255).optional().nullable();
const vietnamesePhone = z.string().trim().regex(/^0[0-9]{9}$/, "Số điện thoại không hợp lệ");
const optionalDate = z
  .union([z.string().date(), z.literal(""), z.null()])
  .optional();

export const crmQuerySchema = z.object({
  tab: z.enum(["leads", "customers", "reminders", "zns", "loyalty", "stats"]).default("leads"),
  allBranches: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  search: z.string().trim().max(100).default(""),
  category: z.enum(["", "all", "service", "purchase", "vip", "inactive"]).default(""),
});

const customerFields = {
  name: z.string().trim().min(1, "Tên khách hàng không được để trống").max(120),
  phone: vietnamesePhone,
  email: z.union([z.string().trim().email(), z.literal(""), z.null()]).optional(),
  address: optionalText,
  source: z.string().trim().max(50).default("WALKIN"),
  birthday: optionalDate,
  vehiclePlates: z.union([z.string(), z.array(z.string().trim().max(30)).max(20)]).optional(),
  tags: z.union([z.string(), z.array(z.string().trim().max(50)).max(20)]).optional(),
};

export const createCrmEntrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("customer"), ...customerFields }).strict(),
  z.object({
    type: z.literal("lead"),
    name: z.string().trim().min(1).max(120),
    phone: vietnamesePhone,
    source: z.string().trim().max(50).default("WALKIN"),
    interest: optionalText,
    notes: z.string().trim().max(2000).optional().nullable(),
    assignedToId: z.coerce.number().int().positive().optional().nullable(),
  }).strict(),
]);

export const updateCustomerSchema = z.object({
  type: z.literal("customer"),
  name: customerFields.name.optional(),
  phone: customerFields.phone.optional(),
  email: customerFields.email,
  address: customerFields.address,
  source: z.string().trim().max(50).optional(),
  birthday: optionalDate,
  vehiclePlates: customerFields.vehiclePlates,
  tags: customerFields.tags,
}).strict();

export const updateLeadSchema = z.object({
  type: z.literal("lead"),
  name: z.string().trim().min(1).max(120).optional(),
  phone: vietnamesePhone.optional(),
  source: z.string().trim().max(50).optional(),
  status: z.enum(["NEW", "CONSULTING", "POTENTIAL", "CONVERTED", "LOST"]).optional(),
  interest: optionalText,
  notes: z.string().trim().max(2000).optional().nullable(),
  assignedToId: z.coerce.number().int().positive().optional().nullable(),
  customerId: z.coerce.number().int().positive().optional().nullable(),
}).strict();

export const updateCrmEntrySchema = z.discriminatedUnion("type", [
  updateCustomerSchema,
  updateLeadSchema,
]);
