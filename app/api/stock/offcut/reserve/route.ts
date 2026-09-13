import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { piece } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";

/**
 * "Use in cut plan" from the offcut bank (UI spec §6.5) — reserves an
 * offcut so it can't be double-allocated while the munshi decides which
 * job it goes to, mirroring how Cut Plan reserves a lot's fresh logs at
 * save time (Day 8). It only toggles free<->reserved; an offcut already
 * consumed/dispatched/cancelled is left alone.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("stock", "update");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json({ error: "No mill in session." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const pieceId = body?.pieceId;
  const reserve = Boolean(body?.reserve);
  if (!pieceId) {
    return NextResponse.json({ error: "Missing piece id." }, { status: 400 });
  }

  const pieceRow = await db.query.piece.findFirst({
    where: and(eq(piece.id, pieceId), eq(piece.millId, session.millId), eq(piece.purpose, "offcut")),
  });
  if (!pieceRow) {
    return NextResponse.json({ error: "Offcut not found." }, { status: 404 });
  }
  const fromStatus = reserve ? "free" : "reserved";
  const toStatus = reserve ? "reserved" : "free";
  if (pieceRow.status !== fromStatus) {
    return NextResponse.json(
      { error: `Offcut is ${pieceRow.status}, not ${fromStatus}.` },
      { status: 409 },
    );
  }

  await db.update(piece).set({ status: toStatus }).where(eq(piece.id, pieceId));

  await writeAudit({
    millId: session.millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "update",
    entityTable: "piece",
    entityId: pieceId,
    before: { status: fromStatus },
    after: { status: toStatus },
  });

  return NextResponse.json({ status: toStatus });
}
