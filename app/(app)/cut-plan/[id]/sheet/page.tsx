import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { conversion, conversionInput, conversionTarget, location, lot, piece, species } from "@/lib/db/schema";
import { formatCft } from "@/lib/i18n/format";

// Cut sheet — architecture/UI spec §6.3: "printable ... Large numbers,
// species colour, bay codes, target sizes, nothing else. No prose."
// Print CSS in globals.css hides the app shell (header/nav) for this route.
export default async function CutSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.millId) return null;

  const conversionRow = await db.query.conversion.findFirst({
    where: eq(conversion.id, id),
  });
  if (!conversionRow || conversionRow.millId !== session.millId || !conversionRow.lotId) {
    notFound();
  }

  const [lotRow, targets, inputs] = await Promise.all([
    db.query.lot.findFirst({ where: eq(lot.id, conversionRow.lotId) }),
    db.select().from(conversionTarget).where(eq(conversionTarget.conversionId, id)),
    db
      .select({ bayCode: location.code })
      .from(conversionInput)
      .innerJoin(piece, eq(piece.id, conversionInput.pieceId))
      .leftJoin(location, eq(location.id, piece.locationId))
      .where(eq(conversionInput.conversionId, id)),
  ]);
  if (!lotRow) notFound();

  const speciesRow = await db.query.species.findFirst({ where: eq(species.id, lotRow.speciesId) });
  const bayCodes = [...new Set(inputs.map((i) => i.bayCode).filter(Boolean))];

  return (
    <div className="mx-auto max-w-lg p-8 print:p-0">
      <div
        className="mb-6 h-2 w-full rounded-full"
        style={{ background: speciesRow?.colourHex ?? "#8B949C" }}
      />
      <h1 className="text-[36px] font-semibold tabular-nums text-[#14171A]">{lotRow.code}</h1>
      <p className="mb-6 text-[24px] text-[#4A5057]">{speciesRow?.nameEn}</p>

      {bayCodes.length > 0 && (
        <p className="mb-6 text-[17px] text-[#4A5057]">Bay: {bayCodes.join(", ")}</p>
      )}

      <div className="flex flex-col gap-3">
        {targets.map((t) => (
          <div key={t.id} className="flex items-baseline justify-between border-b border-[#C9CFD4] py-2">
            <span className="text-[24px] font-semibold tabular-nums text-[#14171A]">
              {Math.round(t.thicknessMm / 25.4)}×{Math.round(t.widthMm / 25.4)}×
              {Math.round((t.lengthMm / 304.8) * 10) / 10}ft
            </span>
            {t.targetQuantity && (
              <span className="text-[17px] tabular-nums text-[#4A5057]">
                {formatCft(Number(t.targetQuantity))} pcs
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
