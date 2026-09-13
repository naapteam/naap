import { z } from "zod";

// end_checks | sweep | taper | borer | hollow | stain — architecture §3
export const DEFECT_CODES = [
  "end_checks",
  "sweep",
  "taper",
  "borer",
  "hollow",
  "stain",
] as const;

export const tallyRowSchema = z.object({
  girthMm: z.number().int().positive(),
  lengthMm: z.number().int().positive(),
});

export const bulkSchema = z.object({
  pieces: z.number().int().positive().optional(),
  cft: z.number().positive(),
});

export const closeIntakePayloadSchema = z
  .object({
    supplierId: z.string().uuid().nullable(),
    vehicleNo: z.string().trim().max(50).optional(),
    tpNumber: z.string().trim().max(50).optional(),
    tpExpiry: z.string().optional(),
    declaredPieces: z.number().int().nonnegative().optional(),
    declaredCft: z.number().nonnegative().optional(),
    arrivedAt: z.string().min(1),
    defects: z.array(z.enum(DEFECT_CODES)),
    speciesId: z.string().uuid(),
    mode: z.enum(["piece", "bulk"]),
    tallyRows: z.array(tallyRowSchema).optional(),
    bulk: bulkSchema.optional(),
    bayId: z.string().uuid().nullable(),
    varianceNote: z.string().trim().max(500).optional(),
    // Owner-only encrypted rate (architecture §8) — ciphertext/IV only,
    // the server never sees a plaintext rate.
    rateCiphertext: z.string().optional(),
    rateIv: z.string().optional(),
  })
  .refine(
    (d) =>
      d.mode === "piece"
        ? !!d.tallyRows && d.tallyRows.length > 0
        : !!d.bulk,
    { message: "Add at least one tally row (or switch to bulk mode)." },
  );

export type CloseIntakePayload = z.infer<typeof closeIntakePayloadSchema>;
