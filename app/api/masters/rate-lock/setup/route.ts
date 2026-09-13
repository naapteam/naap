import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mill } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("rates", "update");
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
  const { salt, verifierCiphertext, verifierIv } = body ?? {};
  if (!salt || !verifierCiphertext || !verifierIv) {
    return NextResponse.json({ error: "Missing setup data." }, { status: 400 });
  }

  const millRow = await db.query.mill.findFirst({ where: eq(mill.id, session.millId) });
  if (!millRow) {
    return NextResponse.json({ error: "Mill not found." }, { status: 404 });
  }

  const settings = (millRow.settings ?? {}) as Record<string, unknown>;
  await db
    .update(mill)
    .set({
      settings: {
        ...settings,
        rateLock: { enabled: true, salt, verifierCiphertext, verifierIv },
      },
    })
    .where(eq(mill.id, session.millId));

  await writeAudit({
    millId: session.millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "update",
    entityTable: "mill",
    entityId: session.millId,
    after: { rateLockEnabled: true },
  });

  return NextResponse.json({ ok: true });
}
