import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.coerce.number().finite().positive("Số tiền phải lớn hơn 0"),
}).strict();

export const wholesalePaymentSchema = paymentSchema.extend({
  vehicleIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
}).strict();
