import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversion, conversionInput, piece } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try {
    session = await requireCan("cutPlan", "cancel");
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

  const conversionRow = await db.query.conversion.findFirst({
    where: and(eq(conversion.id, id), eq(conversion.millId, millId)),
  });
  if (!conversionRow || conversionRow.status !== "planned") {
    return NextResponse.json({ error: "Cut plan not found or already resolved." }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.update(conversion).set({ status: "cancelled" }).where(eq(conversion.id, id));

    const inputRows = await tx
      .select({ pieceId: conversionInput.pieceId })
      .from(conversionInput)
      .where(eq(conversionInput.conversionId, id));
    if (inputRows.length > 0) {
      await tx
        .update(piece)
        .set({ status: "free" })
        .where(
          inArray(
            piece.id,
            inputRows.map((r) => r.pieceId),
          ),
        );
    }
  });

  await writeAudit({
    millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "cancel",
    entityTable: "conversion",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
