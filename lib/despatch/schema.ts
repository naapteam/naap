import { z } from "zod";

export const createDespatchPayloadSchema = z.object({
  customerId: z.string().uuid().nullable(),
  vehicleNo: z.string().trim().max(50).optional(),
  challanNo: z.string().trim().max(50).optional(),
  tpNumber: z.string().trim().max(50).optional(),
  dispatchedAt: z.string().min(1),
  pieceIds: z.array(z.string().uuid()).min(1),
  // Owner-only encrypted rate (architecture §8) — ciphertext/IV only,
  // the server never sees a plaintext rate.
  rateCiphertext: z.string().optional(),
  rateIv: z.string().optional(),
});

export type CreateDespatchPayload = z.infer<typeof createDespatchPayloadSchema>;
