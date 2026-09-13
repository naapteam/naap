import { z } from "zod";

export const createDespatchPayloadSchema = z.object({
  customerId: z.string().uuid().nullable(),
  vehicleNo: z.string().trim().max(50).optional(),
  challanNo: z.string().trim().max(50).optional(),
  tpNumber: z.string().trim().max(50).optional(),
  dispatchedAt: z.string().min(1),
  pieceIds: z.array(z.string().uuid()).min(1),
});

export type CreateDespatchPayload = z.infer<typeof createDespatchPayloadSchema>;
