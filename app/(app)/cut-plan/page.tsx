import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { intake, lot, piece, sizePreset, species } from "@/lib/db/schema";
import { CutPlanWizard } from "@/components/cutplan/CutPlanWizard";

export default async function CutPlanPage() {
  const session = await getSession();
  if (!session?.millId) return null;
  const millId = session.millId;

  const lotsRaw = await db
    .select({
      lotId: lot.id,
      lotCode: lot.code,
      speciesId: lot.speciesId,
      speciesNameEn: species.nameEn,
      speciesColour: species.colourHex,
      recoveryLow: species.recoveryLow,
      recoveryHigh: species.recoveryHigh,
      byproductPct: species.byproductPct,
      pieceCount: sql<number>`count(${piece.id})::int`,
      totalCft: sql<string>`sum(${piece.volumeCft})`,
      avgGirthMm: sql<number>`avg(${piece.girthMm})::int`,
      oldestCreatedAt: sql<Date>`min(${piece.createdAt})`,
      defects: intake.defects,
    })
    .from(lot)
    .innerJoin(
      piece,
      and(
        eq(piece.lotId, lot.id),
        eq(piece.status, "free"),
        eq(piece.purpose, "primary"),
        inArray(piece.form, ["log", "cant"]),
      ),
    )
    .leftJoin(species, eq(species.id, lot.speciesId))
    .leftJoin(intake, eq(intake.id, lot.intakeId))
    .where(eq(lot.millId, millId))
    .groupBy(
      lot.id,
      lot.code,
      lot.speciesId,
      species.nameEn,
      species.colourHex,
      species.recoveryLow,
      species.recoveryHigh,
      species.byproductPct,
      intake.defects,
    )
    .orderBy(desc(sql`min(${piece.createdAt})`));

  // Raw sql<T> aggregates (min/avg above) are type hints only — the driver
  // doesn't necessarily hand back a Date for `min(timestamptz)` the way it
  // does for a plain typed column, so normalize explicitly before this
  // crosses into the client component.
  const lots = lotsRaw.map((l) => ({
    ...l,
    oldestCreatedAt: new Date(l.oldestCreatedAt),
  }));

  const sizePresets = await db
    .select()
    .from(sizePreset)
    .where(eq(sizePreset.millId, millId))
    .orderBy(desc(sizePreset.useCount))
    .limit(10);

  return <CutPlanWizard lots={lots} sizePresets={sizePresets} />;
}
