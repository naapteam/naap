import { NextResponse } from "next/server";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { findOffcutMatches } from "@/lib/cutplan/offcutMatcher";

export async function POST(req: Request) {
  let session;
  try {
    session = await requireCan("cutPlan", "read");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json({ matches: [] });
  }

  const body = await req.json().catch(() => null);
  const speciesId = body?.speciesId;
  const thicknessMm = Number(body?.thicknessMm);
  const widthMm = Number(body?.widthMm);
  const lengthMm = Number(body?.lengthMm);
  if (!speciesId || !thicknessMm || !widthMm || !lengthMm) {
    return NextResponse.json({ error: "Missing target dimensions." }, { status: 400 });
  }

  const matches = await findOffcutMatches({
    millId: session.millId,
    speciesId,
    thicknessMm,
    widthMm,
    lengthMm,
  });
  return NextResponse.json({ matches });
}
