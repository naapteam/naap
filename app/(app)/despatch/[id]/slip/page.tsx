import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { despatch, despatchLine, party, piece, species } from "@/lib/db/schema";
import { formatCft, formatDate } from "@/lib/i18n/format";
import { formatPieceSize } from "@/lib/stock/format";

// Challan — architecture §6.6: "a simple printable slip", no GST invoice in
// v1. Print CSS in globals.css hides the app shell chrome when printed.
export default async function DespatchSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.millId) return null;

  const despatchRow = await db.query.despatch.findFirst({ where: eq(despatch.id, id) });
  if (!despatchRow || despatchRow.millId !== session.millId) notFound();

  const [customer, lines] = await Promise.all([
    despatchRow.customerId
      ? db.query.party.findFirst({ where: eq(party.id, despatchRow.customerId) })
      : Promise.resolve(undefined),
    db
      .select({
        cft: despatchLine.cft,
        form: piece.form,
        girthMm: piece.girthMm,
        lengthMm: piece.lengthMm,
        thicknessMm: piece.thicknessMm,
        widthMm: piece.widthMm,
        speciesNameEn: species.nameEn,
      })
      .from(despatchLine)
      .innerJoin(piece, eq(piece.id, despatchLine.pieceId))
      .leftJoin(species, eq(species.id, piece.speciesId))
      .where(eq(despatchLine.despatchId, id)),
  ]);

  return (
    <div className="mx-auto max-w-lg p-8 print:p-0">
      <h1 className="text-[24px] font-semibold text-[#14171A]">Challan {despatchRow.challanNo ?? ""}</h1>
      <p className="mb-4 text-[17px] text-[#4A5057]">{formatDate(despatchRow.dispatchedAt)}</p>

      <dl className="mb-6 grid grid-cols-2 gap-2 text-[17px]">
        <div>
          <dt className="text-sm text-[#4A5057]">Customer</dt>
          <dd className="text-[#14171A]">{customer?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#4A5057]">Vehicle</dt>
          <dd className="text-[#14171A]">{despatchRow.vehicleNo ?? "—"}</dd>
        </div>
        {despatchRow.tpNumber && (
          <div>
            <dt className="text-sm text-[#4A5057]">TP</dt>
            <dd className="text-[#14171A]">{despatchRow.tpNumber}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-2">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between border-b border-[#C9CFD4] py-2">
            <span className="text-[17px] text-[#14171A]">
              {l.speciesNameEn} — {formatPieceSize(l)}
            </span>
            <span className="tabular-nums text-[#14171A]">{formatCft(Number(l.cft))} CFT</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between border-t-[1.5px] border-[#C9CFD4] pt-2">
        <span className="text-[17px] font-semibold text-[#14171A]">Total</span>
        <span className="text-[24px] font-semibold tabular-nums text-[#14171A]">
          {formatCft(Number(despatchRow.totalCft))} CFT
        </span>
      </div>
    </div>
  );
}
