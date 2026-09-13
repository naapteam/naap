import { z } from "zod";

export const targetSchema = z.object({
  thicknessMm: z.number().int().positive(),
  widthMm: z.number().int().positive(),
  lengthMm: z.number().int().positive(),
  targetQuantity: z.number().positive().optional(),
  predictedQuantity: z.number().nonnegative().optional(),
});

export const saveCutPlanPayloadSchema = z.object({
  lotId: z.string().uuid(),
  targets: z.array(targetSchema).min(1),
  usedOffcutIds: z.array(z.string().uuid()),
  predicted: z.object({
    outputLow: z.number(),
    outputHigh: z.number(),
    offcut: z.number(),
    byproduct: z.number(),
    waste: z.number(),
    recoveryLow: z.number(),
    recoveryHigh: z.number(),
  }),
  basis: z.record(z.string(), z.unknown()),
});

export type SaveCutPlanPayload = z.infer<typeof saveCutPlanPayloadSchema>;
