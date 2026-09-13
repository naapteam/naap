import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { despatch, despatchLine, piece } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { createDespatchPayloadSchema } from "@/lib/despatch/schema";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("despatch", "create");
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
  const parsed = createDespatchPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid despatch." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const pieces = await db
    .select()
    .from(piece)
    .where(
      and(eq(piece.millId, millId), eq(piece.status, "free"), inArray(piece.id, body.pieceIds)),
    );
  if (pieces.length !== body.pieceIds.length) {
    return NextResponse.json(
      { error: "Some selected stock is no longer available." },
      { status: 409 },
    );
  }

  const totalCft = pieces.reduce((s, p) => s + Number(p.volumeCft), 0);
  const dispatchedAt = new Date(body.dispatchedAt);
  if (Number.isNaN(dispatchedAt.getTime())) {
    return NextResponse.json({ error: "Invalid despatch date." }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [despatchRow] = await tx
      .insert(despatch)
      .values({
        millId,
        customerId: body.customerId,
        vehicleNo: body.vehicleNo,
        challanNo: body.challanNo,
        tpNumber: body.tpNumber,
        totalCft: totalCft.toString(),
        dispatchedAt,
        createdBy: session.userId,
        status: "done",
      })
      .returning();

    await tx.insert(despatchLine).values(
      pieces.map((p) => ({
        despatchId: despatchRow.id,
        pieceId: p.id,
        cft: p.volumeCft,
      })),
    );

    await tx
      .update(piece)
      .set({ status: "dispatched" })
      .where(
        inArray(
          piece.id,
          pieces.map((p) => p.id),
        ),
      );

    return despatchRow;
  });

  await writeAudit({
    millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "create",
    entityTable: "despatch",
    entityId: result.id,
    after: { totalCft, pieceCount: pieces.length },
  });

  return NextResponse.json({ despatchId: result.id });
}
