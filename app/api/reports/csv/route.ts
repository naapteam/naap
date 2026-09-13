import { NextResponse } from "next/server";
import { AuthError, requireCan } from "@/lib/auth/guard";
import { toCsv } from "@/lib/reports/csv";
import {
  getDeadStock,
  getRecoveryRows,
  getReconciliation,
  getSupplierScorecard,
} from "@/lib/reports/queries";
import { formatDate } from "@/lib/i18n/format";

export async function GET(req: Request) {
  let session;
  try {
    session = await requireCan("reports", "export");
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  if (!session.millId) {
    return NextResponse.json({ error: "No mill in session." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = new Date(searchParams.get("from") ?? "1970-01-01");
  const to = new Date(searchParams.get("to") ?? Date.now());

  let csv = "";
  if (type === "recovery") {
    const rows = await getRecoveryRows(session.millId, from, to);
    csv = toCsv(
      rows.map((r) => ({
        date: formatDate(r.occurredAt),
        lot: r.lotCode,
        species: r.speciesNameEn,
        input_cft: r.inputCft.toFixed(2),
        output_cft: r.outputCft.toFixed(2),
        recovery_pct: r.recoveryPct.toFixed(1),
      })),
    );
  } else if (type === "reconciliation") {
    const r = await getReconciliation(session.millId, from, to);
    csv = toCsv([
      {
        intake_cft: r.intakeCft.toFixed(2),
        output_cft: r.outputCft.toFixed(2),
        byproduct_cft: r.byproductCft.toFixed(2),
        dispatched_cft: r.dispatchedCft.toFixed(2),
        unexplained_cft: r.unexplainedCft.toFixed(2),
      },
    ]);
  } else if (type === "deadstock") {
    const rows = await getDeadStock(session.millId);
    csv = toCsv(rows.map((r) => ({ band: r.band, pieces: r.pieces, cft: r.cft.toFixed(2) })));
  } else if (type === "suppliers") {
    const rows = await getSupplierScorecard(session.millId);
    csv = toCsv(
      rows.map((r) => ({
        supplier: r.name,
        consignments: r.consignments,
        cft_supplied: r.cftSupplied.toFixed(2),
        avg_recovery_pct: r.avgRecoveryPct.toFixed(1),
      })),
    );
  } else {
    return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
