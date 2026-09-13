import { z } from "zod";

export const speciesPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  nameEn: z.string().trim().min(1).max(100),
  nameHi: z.string().trim().max(100).optional(),
  nameMr: z.string().trim().max(100).optional(),
  nameGu: z.string().trim().max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(6)
    .transform((s) => s.toUpperCase()),
  colourHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #8B5E34"),
  defaultConvention: z.enum(["hoppus", "true", "cbm"]).default("hoppus"),
  recoveryLow: z.number().min(0).max(100),
  recoveryHigh: z.number().min(0).max(100),
  byproductPct: z.number().min(0).max(100).default(18),
  minOffcutLengthMm: z.number().int().positive().default(450),
  minOffcutWidthMm: z.number().int().positive().default(50),
});

export type SpeciesPayload = z.infer<typeof speciesPayloadSchema>;

// sawmill_licence | gst_cert | pollution_consent | factory_licence | other
export const COMPLIANCE_KINDS = [
  "sawmill_licence",
  "gst_cert",
  "pollution_consent",
  "factory_licence",
  "other",
] as const;

export const compliancePayloadSchema = z.object({
  kind: z.enum(COMPLIANCE_KINDS),
  label: z.string().trim().min(1).max(200),
  number: z.string().trim().max(100).optional(),
  issuedOn: z.string().optional(),
  expiresOn: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

export type CompliancePayload = z.infer<typeof compliancePayloadSchema>;
