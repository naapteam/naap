import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conversion, lot, species } from "@/lib/db/schema";
import { ageBand, ageInDays } from "@/lib/stock/format";

// Every query here mirrors architecture doc §7 as closely as Drizzle
// allows — these are the numbers the pilot pitch is built on, so they stay
// traceable back to the spec rather than reinvented.

export type RecoveryRow = {
  lotId: string;
  lotCode: string;
  speciesNameEn: string | null;
  speciesColour: string | null;
  occurredAt: Date;
  inputCft: number;
  outputCft: number;
  recoveryPct: number;
};

export async function getRecoveryRows(
  millId: string,
  from: Date,
  to: Date,
): Promise<RecoveryRow[]> {
  const rows = await db
    .select({
      lotId: lot.id,
      lotCode: lot.code,
      speciesNameEn: species.nameEn,
      speciesColour: species.colourHex,
      occurredAt: conversion.occurredAt,
      inputCft: conversion.inputCft,
      outputCft: conversion.outputCft,
      recoveryPct: conversion.recoveryPct,
    })
    .from(conversion)
    .innerJoin(lot, eq(lot.id, conversion.lotId))
    .leftJoin(species, eq(species.id, lot.speciesId))
    .where(
      and(
        eq(conversion.millId, millId),
        eq(conversion.status, "confirmed"),
        gte(conversion.occurredAt, from),
        lte(conversion.occurredAt, to),
      ),
    )
    .orderBy(desc(conversion.occurredAt));

  return rows.map((r) => ({
    ...r,
    inputCft: Number(r.inputCft ?? 0),
    outputCft: Number(r.outputCft ?? 0),
    recoveryPct: Number(r.recoveryPct ?? 0),
  }));
}

export function groupRecoveryByMonth(rows: RecoveryRow[]) {
  const byMonth = new Map<string, { input: number; output: number }>();
  for (const r of rows) {
    const key = `${r.occurredAt.getFullYear()}-${String(r.occurredAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = byMonth.get(key) ?? { input: 0, output: 0 };
    entry.input += r.inputCft;
    entry.output += r.outputCft;
    byMonth.set(key, entry);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      input: v.input,
      output: v.output,
      recoveryPct: v.input > 0 ? (v.output / v.input) * 100 : 0,
    }));
}

export type Reconciliation = {
  intakeCft: number;
  outputCft: number;
  byproductCft: number;
  dispatchedCft: number;
  unexplainedCft: number;
};

export async function getReconciliation(
  millId: string,
  from: Date,
  to: Date,
): Promise<Reconciliation> {
  const result = await db.execute<{
    intake_cft: string;
    output_cft: string;
    byproduct_cft: string;
    dispatched_cft: string;
    unexplained_cft: string;
  }>(sql`
    WITH i AS (SELECT COALESCE(SUM(tallied_cft),0) v FROM intake
               WHERE mill_id=${millId} AND arrived_at BETWEEN ${from} AND ${to} AND status='closed'),
         o AS (SELECT COALESCE(SUM(output_cft),0) v FROM conversion
               WHERE mill_id=${millId} AND occurred_at BETWEEN ${from} AND ${to} AND status='confirmed'),
         b AS (SELECT COALESCE(SUM(volume_cft),0) v FROM piece
               WHERE mill_id=${millId} AND purpose='byproduct' AND occurred_at BETWEEN ${from} AND ${to}),
         d AS (SELECT COALESCE(SUM(total_cft),0) v FROM despatch
               WHERE mill_id=${millId} AND dispatched_at BETWEEN ${from} AND ${to})
    SELECT i.v AS intake_cft, o.v AS output_cft, b.v AS byproduct_cft, d.v AS dispatched_cft,
           i.v - (o.v + b.v) AS unexplained_cft
    FROM i, o, b, d
  `);
  const row = result.rows[0];
  return {
    intakeCft: Number(row?.intake_cft ?? 0),
    outputCft: Number(row?.output_cft ?? 0),
    byproductCft: Number(row?.byproduct_cft ?? 0),
    dispatchedCft: Number(row?.dispatched_cft ?? 0),
    unexplainedCft: Number(row?.unexplained_cft ?? 0),
  };
}

export type DeadStockBand = {
  band: "0-30" | "31-60" | "61-90" | "90+";
  pieces: number;
  cft: number;
};

export async function getDeadStock(millId: string): Promise<DeadStockBand[]> {
  const result = await db.execute<{ created_at: Date; volume_cft: string }>(sql`
    SELECT created_at, volume_cft FROM piece
    WHERE mill_id = ${millId} AND purpose = 'offcut' AND status = 'free'
  `);
  const bands: Record<string, DeadStockBand> = {
    "0-30": { band: "0-30", pieces: 0, cft: 0 },
    "31-60": { band: "31-60", pieces: 0, cft: 0 },
    "61-90": { band: "61-90", pieces: 0, cft: 0 },
    "90+": { band: "90+", pieces: 0, cft: 0 },
  };
  for (const row of result.rows) {
    const band = ageBand(ageInDays(new Date(row.created_at)));
    bands[band].pieces += 1;
    bands[band].cft += Number(row.volume_cft);
  }
  return Object.values(bands);
}

export type SupplierScoreRow = {
  name: string;
  consignments: number;
  cftSupplied: number;
  avgRecoveryPct: number;
};

export async function getSupplierScorecard(millId: string): Promise<SupplierScoreRow[]> {
  const result = await db.execute<{
    name: string;
    consignments: string;
    cft_supplied: string;
    avg_recovery_pct: string;
  }>(sql`
    SELECT pt.name,
           COUNT(DISTINCT i.id) AS consignments,
           ROUND(SUM(i.tallied_cft),2) AS cft_supplied,
           ROUND(AVG(c.recovery_pct),2) AS avg_recovery_pct
    FROM intake i
    JOIN party pt ON pt.id = i.supplier_id
    JOIN lot l ON l.intake_id = i.id
    JOIN conversion c ON c.lot_id = l.id AND c.status='confirmed'
    WHERE i.mill_id = ${millId}
    GROUP BY pt.name HAVING COUNT(DISTINCT i.id) >= 2
    ORDER BY avg_recovery_pct DESC
  `);
  return result.rows.map((r) => ({
    name: r.name,
    consignments: Number(r.consignments),
    cftSupplied: Number(r.cft_supplied),
    avgRecoveryPct: Number(r.avg_recovery_pct),
  }));
}
