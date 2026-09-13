import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { conversion, intake, lot, piece, sizePreset, species } from "@/lib/db/schema";
import { CutPlanWizard } from "@/components/cutplan/CutPlanWizard";
import { formatCft } from "@/lib/i18n/format";

export default async function CutPlanPage() {
  const session = await getSession();
  const t = await getTranslations("cutPlan");
  if (!session?.millId) return null;
  const millId = session.millId;

  const pending = await db
    .select({
      id: conversion.id,
      lotCode: lot.code,
      predictedOutputLow: conversion.predictedOutputLow,
      predictedOutputHigh: conversion.predictedOutputHigh,
    })
    .from(conversion)
    .leftJoin(lot, eq(lot.id, conversion.lotId))
    .where(and(eq(conversion.millId, millId), eq(conversion.status, "planned")))
    .orderBy(desc(conversion.occurredAt));

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

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-[#4A5057]">
            {t("pendingConfirmations")}
          </h2>
          <ul className="flex flex-col gap-1">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-[17px] text-[#14171A]">
                  {p.lotCode} · {formatCft(Number(p.predictedOutputLow))} –{" "}
                  {formatCft(Number(p.predictedOutputHigh))} CFT
                </span>
                <Link href={`/cut-plan/${p.id}/confirm`} className="text-sm text-[#1B6BB8]">
                  {t("confirmLink")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CutPlanWizard lots={lots} sizePresets={sizePresets} />
    </div>
  );
}
