import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversion, conversionInput, conversionTarget, lot, piece } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { saveCutPlanPayloadSchema } from "@/lib/cutplan/schema";
import { allocateTargetQuantities } from "@/lib/cutplan/targetAllocation";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("cutPlan", "create");
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
  const parsed = saveCutPlanPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid cut plan." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const lotRow = await db.query.lot.findFirst({
    where: and(eq(lot.id, body.lotId), eq(lot.millId, millId)),
  });
  if (!lotRow) {
    return NextResponse.json({ error: "Lot not found." }, { status: 404 });
  }

  const inputPieces = await db
    .select()
    .from(piece)
    .where(
      and(
        eq(piece.lotId, lotRow.id),
        eq(piece.purpose, "primary"),
        eq(piece.status, "free"),
        inArray(piece.form, ["log", "cant"]),
      ),
    );
  if (inputPieces.length === 0) {
    return NextResponse.json(
      { error: "No free logs left in this lot to plan a cut against." },
      { status: 400 },
    );
  }

  const inputCft = inputPieces.reduce((s, p) => s + Number(p.volumeCft), 0);

  const result = await db.transaction(async (tx) => {
    const [conversionRow] = await tx
      .insert(conversion)
      .values({
        millId,
        kind: "sawing",
        lotId: lotRow.id,
        predictedOutputLow: body.predicted.outputLow.toString(),
        predictedOutputHigh: body.predicted.outputHigh.toString(),
        predictedOffcut: body.predicted.offcut.toString(),
        predictedByproduct: body.predicted.byproduct.toString(),
        predictedWaste: body.predicted.waste.toString(),
        predictionBasis: {
          ...body.basis,
          usedOffcutIds: body.usedOffcutIds,
          recoveryLow: body.predicted.recoveryLow,
          recoveryHigh: body.predicted.recoveryHigh,
        },
        inputCft: inputCft.toString(),
        status: "planned",
        occurredAt: new Date(),
        createdBy: session.userId,
      })
      .returning();

    const predictedQuantities = allocateTargetQuantities(
      body.targets,
      (body.predicted.outputLow + body.predicted.outputHigh) / 2,
    );

    await tx.insert(conversionTarget).values(
      body.targets.map((t, i) => ({
        conversionId: conversionRow.id,
        thicknessMm: t.thicknessMm,
        widthMm: t.widthMm,
        lengthMm: t.lengthMm,
        targetQuantity: t.targetQuantity?.toString(),
        predictedQuantity: predictedQuantities[i].toString(),
      })),
    );

    await tx.insert(conversionInput).values(
      inputPieces.map((p) => ({
        conversionId: conversionRow.id,
        pieceId: p.id,
        quantityConsumed: p.quantity,
        cftConsumed: p.volumeCft,
      })),
    );

    await tx
      .update(piece)
      .set({ status: "reserved" })
      .where(
        inArray(
          piece.id,
          inputPieces.map((p) => p.id),
        ),
      );

    return conversionRow;
  });

  await writeAudit({
    millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "create",
    entityTable: "conversion",
    entityId: result.id,
    after: { lotCode: lotRow.code, inputCft },
  });

  return NextResponse.json({ conversionId: result.id });
}
