import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  conversion,
  conversionInput,
  conversionOutput,
  conversionTarget,
  lot,
  piece,
} from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { confirmPayloadSchema } from "@/lib/cutplan/confirmSchema";
import { sawnCft } from "@/lib/volume";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try {
    session = await requireCan("cutPlan", "update");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json({ error: "No mill in session." }, { status: 400 });
  }
  const millId = session.millId;

  const json = await req.json().catch(() => null);
  const parsed = confirmPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid confirmation." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const conversionRow = await db.query.conversion.findFirst({
    where: and(eq(conversion.id, id), eq(conversion.millId, millId)),
  });
  if (!conversionRow || conversionRow.status !== "planned" || !conversionRow.lotId) {
    return NextResponse.json({ error: "Cut plan not found or already resolved." }, { status: 404 });
  }

  const targets = await db
    .select()
    .from(conversionTarget)
    .where(eq(conversionTarget.conversionId, id));
  const targetById = new Map(targets.map((t) => [t.id, t]));

  if (body.targetActuals.some((a) => !targetById.has(a.conversionTargetId))) {
    return NextResponse.json({ error: "Unknown target row." }, { status: 400 });
  }

  const lotRow = await db.query.lot.findFirst({ where: eq(lot.id, conversionRow.lotId) });
  if (!lotRow) {
    return NextResponse.json({ error: "Lot not found." }, { status: 404 });
  }

  let actualOutputCft = 0;
  let autoAccepted = true;
  const outputSpecs = body.targetActuals.map((a) => {
    const target = targetById.get(a.conversionTargetId)!;
    const perPieceCft = sawnCft(target.thicknessMm, target.widthMm, target.lengthMm);
    const volumeCft = perPieceCft * a.actualQuantity;
    actualOutputCft += volumeCft;
    if (Number(target.predictedQuantity ?? 0) !== a.actualQuantity) autoAccepted = false;
    return { target, actualQuantity: a.actualQuantity, volumeCft };
  });

  if (Number(conversionRow.predictedOffcut ?? 0) !== body.actualOffcutCft) autoAccepted = false;
  if (Number(conversionRow.predictedByproduct ?? 0) !== body.actualByproductCft) autoAccepted = false;

  const predictedLow = Number(conversionRow.predictedOutputLow ?? 0);
  const predictedHigh = Number(conversionRow.predictedOutputHigh ?? 0);
  const outsideRange = actualOutputCft < predictedLow || actualOutputCft > predictedHigh;
  if (outsideRange && !body.varianceReason) {
    return NextResponse.json(
      { error: "Actual output is outside the predicted range — pick a reason to confirm." },
      { status: 400 },
    );
  }

  const inputCft = Number(conversionRow.inputCft ?? 0);
  const recoveryPct = inputCft > 0 ? (actualOutputCft / inputCft) * 100 : 0;

  await db.transaction(async (tx) => {
    await tx
      .update(conversion)
      .set({
        status: "confirmed",
        outputCft: actualOutputCft.toString(),
        recoveryPct: recoveryPct.toString(),
        varianceReason: body.varianceReason,
        varianceNote: body.varianceNote,
        autoAccepted,
        confirmedBy: session.userId,
        confirmedAt: new Date(),
      })
      .where(eq(conversion.id, id));

    for (const spec of outputSpecs) {
      await tx
        .update(conversionTarget)
        .set({ actualQuantity: spec.actualQuantity.toString() })
        .where(eq(conversionTarget.id, spec.target.id));
    }

    const inputRows = await tx
      .select({ pieceId: conversionInput.pieceId })
      .from(conversionInput)
      .where(eq(conversionInput.conversionId, id));
    if (inputRows.length > 0) {
      await tx
        .update(piece)
        .set({ status: "consumed" })
        .where(
          inArray(
            piece.id,
            inputRows.map((r) => r.pieceId),
          ),
        );
    }

    const newPieces: (typeof piece.$inferInsert)[] = [];
    for (const spec of outputSpecs) {
      if (spec.actualQuantity <= 0) continue;
      newPieces.push({
        millId,
        lotId: lotRow.id,
        form: "sawn",
        purpose: "primary",
        speciesId: lotRow.speciesId,
        thicknessMm: spec.target.thicknessMm,
        widthMm: spec.target.widthMm,
        lengthMm: spec.target.lengthMm,
        quantity: spec.actualQuantity.toString(),
        uom: "piece",
        volumeCft: spec.volumeCft.toString(),
        volumeConvention: "hoppus",
        status: "free",
        occurredAt: new Date(),
        createdBy: session.userId,
      });
    }
    if (body.actualOffcutCft > 0) {
      newPieces.push({
        millId,
        lotId: lotRow.id,
        form: "offcut",
        purpose: "offcut",
        speciesId: lotRow.speciesId,
        quantity: "1",
        uom: "cft",
        volumeCft: body.actualOffcutCft.toString(),
        volumeConvention: "hoppus",
        status: "free",
        occurredAt: new Date(),
        createdBy: session.userId,
      });
    }
    if (body.actualByproductCft > 0) {
      newPieces.push({
        millId,
        lotId: lotRow.id,
        form: "byproduct",
        purpose: "byproduct",
        speciesId: lotRow.speciesId,
        quantity: "1",
        uom: "cft",
        volumeCft: body.actualByproductCft.toString(),
        volumeConvention: "hoppus",
        status: "free",
        occurredAt: new Date(),
        createdBy: session.userId,
      });
    }

    if (newPieces.length > 0) {
      const inserted = await tx.insert(piece).values(newPieces).returning({ id: piece.id });
      await tx.insert(conversionOutput).values(
        inserted.map((p) => ({ conversionId: id, pieceId: p.id })),
      );
    }
  });

  await writeAudit({
    millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "confirm",
    entityTable: "conversion",
    entityId: id,
    before: {
      predictedOutputLow: predictedLow,
      predictedOutputHigh: predictedHigh,
    },
    after: { actualOutputCft, recoveryPct, autoAccepted },
  });

  return NextResponse.json({ ok: true, autoAccepted, actualOutputCft, recoveryPct });
}
