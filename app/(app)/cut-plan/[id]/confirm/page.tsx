import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { conversion, conversionTarget, lot, species } from "@/lib/db/schema";
import { ConfirmForm } from "@/components/cutplan/ConfirmForm";

export default async function ConfirmPage({
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
  if (conversionRow.status !== "planned") {
    notFound();
  }

  const [targets, lotRow] = await Promise.all([
    db.select().from(conversionTarget).where(eq(conversionTarget.conversionId, id)),
    db.query.lot.findFirst({ where: eq(lot.id, conversionRow.lotId) }),
  ]);
  if (!lotRow) notFound();
  const speciesRow = await db.query.species.findFirst({ where: eq(species.id, lotRow.speciesId) });

  return (
    <ConfirmForm
      conversionId={id}
      lotId={lotRow.id}
      lotCode={lotRow.code}
      speciesName={speciesRow?.nameEn ?? ""}
      speciesColour={speciesRow?.colourHex ?? "#8B949C"}
      predictedOutputLow={Number(conversionRow.predictedOutputLow)}
      predictedOutputHigh={Number(conversionRow.predictedOutputHigh)}
      predictedOffcut={Number(conversionRow.predictedOffcut)}
      predictedByproduct={Number(conversionRow.predictedByproduct)}
      inputCft={Number(conversionRow.inputCft)}
      targets={targets.map((t) => ({
        id: t.id,
        thicknessMm: t.thicknessMm,
        widthMm: t.widthMm,
        lengthMm: t.lengthMm,
        predictedQuantity: Number(t.predictedQuantity ?? 0),
      }))}
    />
  );
}
