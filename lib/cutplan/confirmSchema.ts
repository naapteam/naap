import { z } from "zod";

// hollow | borer | rot | sweep | wrong_size | operator | unexplained — architecture §3
export const VARIANCE_REASONS = [
  "hollow",
  "borer",
  "rot",
  "sweep",
  "wrong_size",
  "operator",
  "unexplained",
] as const;

export const confirmPayloadSchema = z.object({
  targetActuals: z.array(
    z.object({
      conversionTargetId: z.string().uuid(),
      actualQuantity: z.number().nonnegative(),
    }),
  ),
  actualOffcutCft: z.number().nonnegative(),
  actualByproductCft: z.number().nonnegative(),
  varianceReason: z.enum(VARIANCE_REASONS).optional(),
  varianceNote: z.string().trim().max(500).optional(),
});

export type ConfirmPayload = z.infer<typeof confirmPayloadSchema>;
