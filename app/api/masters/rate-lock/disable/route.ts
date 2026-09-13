import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mill } from "@/lib/db/schema";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";

// Disabling only turns off the UI's use of rates — the salt/verifier and
// any already-encrypted secure_note rows stay put (nothing is ever hard-
// deleted, architecture §3), so re-enabling with the same passphrase still
// decrypts everything that was captured before.
export async function POST() {
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

  const millRow = await db.query.mill.findFirst({ where: eq(mill.id, session.millId) });
  if (!millRow) {
    return NextResponse.json({ error: "Mill not found." }, { status: 404 });
  }
  const settings = (millRow.settings ?? {}) as Record<string, unknown>;
  const rateLock = (settings.rateLock ?? {}) as Record<string, unknown>;

  await db
    .update(mill)
    .set({ settings: { ...settings, rateLock: { ...rateLock, enabled: false } } })
    .where(eq(mill.id, session.millId));

  await writeAudit({
    millId: session.millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "update",
    entityTable: "mill",
    entityId: session.millId,
    after: { rateLockEnabled: false },
  });

  return NextResponse.json({ ok: true });
}
