"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { complianceDoc, species } from "@/lib/db/schema";
import { requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { compliancePayloadSchema, speciesPayloadSchema } from "./schema";

export type ActionState = { error?: string; ok?: boolean };

export async function upsertSpeciesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireCan("masters", formData.get("id") ? "update" : "create");

  const parsed = speciesPayloadSchema.safeParse({
    id: formData.get("id") || undefined,
    nameEn: formData.get("nameEn"),
    nameHi: formData.get("nameHi") || undefined,
    nameMr: formData.get("nameMr") || undefined,
    nameGu: formData.get("nameGu") || undefined,
    code: formData.get("code"),
    colourHex: formData.get("colourHex"),
    defaultConvention: formData.get("defaultConvention") || "hoppus",
    recoveryLow: Number(formData.get("recoveryLow")),
    recoveryHigh: Number(formData.get("recoveryHigh")),
    byproductPct: Number(formData.get("byproductPct") || 18),
    minOffcutLengthMm: Number(formData.get("minOffcutLengthMm") || 450),
    minOffcutWidthMm: Number(formData.get("minOffcutWidthMm") || 50),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid species data." };
  }
  if (!session.millId) return { error: "No mill in session." };
  const body = parsed.data;

  if (body.id) {
    await db
      .update(species)
      .set({
        nameEn: body.nameEn,
        nameHi: body.nameHi,
        nameMr: body.nameMr,
        nameGu: body.nameGu,
        code: body.code,
        colourHex: body.colourHex,
        defaultConvention: body.defaultConvention,
        recoveryLow: body.recoveryLow.toString(),
        recoveryHigh: body.recoveryHigh.toString(),
        byproductPct: body.byproductPct.toString(),
        minOffcutLengthMm: body.minOffcutLengthMm,
        minOffcutWidthMm: body.minOffcutWidthMm,
      })
      .where(eq(species.id, body.id));
    await writeAudit({
      millId: session.millId,
      actorId: session.userId,
      actorRole: session.role,
      action: "update",
      entityTable: "species",
      entityId: body.id,
      after: body,
    });
  } else {
    const [row] = await db
      .insert(species)
      .values({
        millId: session.millId,
        nameEn: body.nameEn,
        nameHi: body.nameHi,
        nameMr: body.nameMr,
        nameGu: body.nameGu,
        code: body.code,
        colourHex: body.colourHex,
        defaultConvention: body.defaultConvention,
        recoveryLow: body.recoveryLow.toString(),
        recoveryHigh: body.recoveryHigh.toString(),
        byproductPct: body.byproductPct.toString(),
        minOffcutLengthMm: body.minOffcutLengthMm,
        minOffcutWidthMm: body.minOffcutWidthMm,
      })
      .returning();
    await writeAudit({
      millId: session.millId,
      actorId: session.userId,
      actorRole: session.role,
      action: "create",
      entityTable: "species",
      entityId: row.id,
      after: body,
    });
  }

  revalidatePath("/masters");
  return { ok: true };
}

export async function createComplianceDocAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireCan("compliance", "create");
  if (!session.millId) return { error: "No mill in session." };

  const parsed = compliancePayloadSchema.safeParse({
    kind: formData.get("kind"),
    label: formData.get("label"),
    number: formData.get("number") || undefined,
    issuedOn: formData.get("issuedOn") || undefined,
    expiresOn: formData.get("expiresOn") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document." };
  }
  const body = parsed.data;

  const [row] = await db
    .insert(complianceDoc)
    .values({
      millId: session.millId,
      kind: body.kind,
      label: body.label,
      number: body.number,
      issuedOn: body.issuedOn,
      expiresOn: body.expiresOn,
      note: body.note,
    })
    .returning();

  await writeAudit({
    millId: session.millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "create",
    entityTable: "compliance_doc",
    entityId: row.id,
    after: body,
  });

  revalidatePath("/masters");
  return { ok: true };
}
