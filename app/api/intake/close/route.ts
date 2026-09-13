import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { intake, lot, piece, secureNote, species } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { closeIntakePayloadSchema } from "@/lib/intake/schema";
import { buildLotCode, lotCodePrefix } from "@/lib/intake/lotCode";
import { hoppusCft, roundForStorage } from "@/lib/volume";

// Gap beyond this (relative to declared CFT) needs a typed reason before
// the intake can close — UI spec §6.2 step 4 ("gap beyond threshold
// requires a note"). No mill-configurable override yet; that's the
// Masters "Thresholds" screen, Day 13.
const VARIANCE_THRESHOLD_PCT = 5;

export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("intake", "create");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json(
      { error: "Sign in to a specific mill to log intake." },
      { status: 400 },
    );
  }
  const millId = session.millId;

  const json = await req.json().catch(() => null);
  const parsed = closeIntakePayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid intake data." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const speciesRow = await db.query.species.findFirst({
    where: and(eq(species.id, body.speciesId), eq(species.millId, millId)),
  });
  if (!speciesRow) {
    return NextResponse.json({ error: "Unknown species." }, { status: 400 });
  }

  const arrivedAt = new Date(body.arrivedAt);
  if (Number.isNaN(arrivedAt.getTime())) {
    return NextResponse.json({ error: "Invalid arrival date." }, { status: 400 });
  }

  // Compute tally totals and per-piece volumes server-side — never trust
  // client-computed CFT for storage (architecture §4: lib/volume.ts is the
  // single source of truth).
  const pieceRows =
    body.mode === "piece"
      ? (body.tallyRows ?? []).map((row) => ({
          girthMm: row.girthMm,
          lengthMm: row.lengthMm,
          volumeCft: roundForStorage(hoppusCft(row.girthMm, row.lengthMm)),
        }))
      : [];

  const talliedPieces =
    body.mode === "piece" ? pieceRows.length : (body.bulk?.pieces ?? 0);
  const talliedCft =
    body.mode === "piece"
      ? roundForStorage(pieceRows.reduce((s, r) => s + r.volumeCft, 0))
      : roundForStorage(body.bulk!.cft);

  if (body.declaredCft && body.declaredCft > 0) {
    const diffPct =
      (Math.abs(talliedCft - body.declaredCft) / body.declaredCft) * 100;
    if (diffPct > VARIANCE_THRESHOLD_PCT && !body.varianceNote) {
      return NextResponse.json(
        {
          error: `Tallied CFT differs from declared by ${diffPct.toFixed(1)}% — add a variance note to close.`,
        },
        { status: 400 },
      );
    }
  }

  const result = await db.transaction(async (tx) => {
    const [intakeRow] = await tx
      .insert(intake)
      .values({
        millId,
        supplierId: body.supplierId,
        vehicleNo: body.vehicleNo,
        tpNumber: body.tpNumber,
        tpExpiry: body.tpExpiry,
        declaredPieces: body.declaredPieces,
        declaredCft: body.declaredCft?.toString(),
        talliedPieces,
        talliedCft: talliedCft.toString(),
        varianceNote: body.varianceNote,
        defects: body.defects,
        arrivedAt,
        closedAt: new Date(),
        status: "closed",
        createdBy: session.userId,
      })
      .returning();

    if (body.rateCiphertext && body.rateIv) {
      await tx.insert(secureNote).values({
        millId,
        entityTable: "intake",
        entityId: intakeRow.id,
        ciphertext: body.rateCiphertext,
        iv: body.rateIv,
      });
    }

    const prefix = lotCodePrefix(speciesRow.code, arrivedAt);
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(lot)
      .where(and(eq(lot.millId, millId), sql`${lot.code} LIKE ${prefix + "%"}`));
    const lotCode = buildLotCode(speciesRow.code, arrivedAt, count + 1);

    const [lotRow] = await tx
      .insert(lot)
      .values({
        millId,
        intakeId: intakeRow.id,
        code: lotCode,
        speciesId: speciesRow.id,
      })
      .returning();

    if (body.mode === "piece") {
      await tx.insert(piece).values(
        pieceRows.map((row) => ({
          millId,
          lotId: lotRow.id,
          form: "log" as const,
          purpose: "primary" as const,
          speciesId: speciesRow.id,
          girthMm: row.girthMm,
          lengthMm: row.lengthMm,
          quantity: "1",
          uom: "piece" as const,
          volumeCft: row.volumeCft.toString(),
          volumeConvention: "hoppus",
          locationId: body.bayId,
          status: "free" as const,
          occurredAt: arrivedAt,
          createdBy: session.userId,
        })),
      );
    } else {
      await tx.insert(piece).values({
        millId,
        lotId: lotRow.id,
        form: "log",
        purpose: "primary",
        speciesId: speciesRow.id,
        quantity: String(body.bulk!.pieces ?? 1),
        uom: body.bulk!.pieces ? "piece" : "cft",
        volumeCft: talliedCft.toString(),
        volumeConvention: "hoppus",
        locationId: body.bayId,
        status: "free",
        isBulk: true,
        occurredAt: arrivedAt,
        createdBy: session.userId,
      });
    }

    return { intakeRow, lotRow };
  });

  await writeAudit({
    millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "create",
    entityTable: "intake",
    entityId: result.intakeRow.id,
    after: { lotCode: result.lotRow.code, talliedPieces, talliedCft },
  });

  return NextResponse.json({
    intakeId: result.intakeRow.id,
    lotId: result.lotRow.id,
    lotCode: result.lotRow.code,
  });
}
