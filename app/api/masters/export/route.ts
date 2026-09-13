import { NextResponse } from "next/server";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/auth/audit";
import { buildMillExportWorkbook } from "@/lib/masters/export";

export async function GET() {
  let session;
  try {
    session = await requireCan("masters", "export");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json({ error: "No mill in session." }, { status: 400 });
  }

  const workbook = await buildMillExportWorkbook(session.millId);
  const buffer = await workbook.xlsx.writeBuffer();

  await writeAudit({
    millId: session.millId,
    actorId: session.userId,
    actorRole: session.role,
    action: "export",
    entityTable: "mill",
    entityId: session.millId,
    after: {},
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="naap-export-${dateStamp}.xlsx"`,
    },
  });
}
