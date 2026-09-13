import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { complianceDoc, conversion } from "@/lib/db/schema";
import { complianceTone } from "@/lib/masters/compliance";
import { getDeadStock, getReconciliation, getRecoveryRows } from "./queries";

export type DashboardMetrics = {
  intakeTodayCft: number;
  outputTodayCft: number;
  recoveryMonthPct: number;
  deadStockOver60Cft: number;
  unexplainedMonthCft: number;
};

export async function getDashboardMetrics(millId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRecon, monthRows, monthRecon, deadStockBands] = await Promise.all([
    getReconciliation(millId, startOfDay, now),
    getRecoveryRows(millId, startOfMonth, now),
    getReconciliation(millId, startOfMonth, now),
    getDeadStock(millId),
  ]);

  const monthInput = monthRows.reduce((s, r) => s + r.inputCft, 0);
  const monthOutput = monthRows.reduce((s, r) => s + r.outputCft, 0);
  const deadStockOver60Cft = deadStockBands
    .filter((b) => b.band === "61-90" || b.band === "90+")
    .reduce((s, b) => s + b.cft, 0);

  return {
    intakeTodayCft: todayRecon.intakeCft,
    outputTodayCft: todayRecon.outputCft,
    recoveryMonthPct: monthInput > 0 ? (monthOutput / monthInput) * 100 : 0,
    deadStockOver60Cft,
    unexplainedMonthCft: monthRecon.unexplainedCft,
  };
}

export async function getPendingConfirmationsCount(millId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversion)
    .where(and(eq(conversion.millId, millId), eq(conversion.status, "planned")));
  return row?.count ?? 0;
}

export type PredictionAccuracy = {
  total: number;
  insideRange: number;
  outsideRange: number;
};

// Architecture §5 / UI spec §6.1: "Last 30 cuts: 24 inside range, 6 outside" —
// whether the confirmed actual output landed within the predicted band.
export async function getPredictionAccuracy(millId: string): Promise<PredictionAccuracy> {
  const rows = await db
    .select({
      outputCft: conversion.outputCft,
      predictedOutputLow: conversion.predictedOutputLow,
      predictedOutputHigh: conversion.predictedOutputHigh,
    })
    .from(conversion)
    .where(and(eq(conversion.millId, millId), eq(conversion.status, "confirmed")))
    .orderBy(desc(conversion.confirmedAt))
    .limit(30);

  let insideRange = 0;
  for (const r of rows) {
    const output = Number(r.outputCft ?? 0);
    const low = Number(r.predictedOutputLow ?? 0);
    const high = Number(r.predictedOutputHigh ?? 0);
    if (output >= low && output <= high) insideRange++;
  }
  return { total: rows.length, insideRange, outsideRange: rows.length - insideRange };
}

export type AutoAcceptRow = {
  userId: string;
  userName: string;
  total: number;
  autoAccepted: number;
  ratePct: number;
};

// Architecture §5 "rubber-stamp guard": a manager confirming everything with
// zero edits should be visible to the owner, not quietly trusted.
export async function getAutoAcceptRates(millId: string): Promise<AutoAcceptRow[]> {
  const result = await db.execute<{
    user_id: string;
    name: string;
    total: string;
    auto_accepted: string;
  }>(sql`
    SELECT u.id AS user_id, u.name,
           COUNT(*) AS total,
           SUM(CASE WHEN c.auto_accepted THEN 1 ELSE 0 END) AS auto_accepted
    FROM conversion c
    JOIN app_user u ON u.id = c.confirmed_by
    WHERE c.mill_id = ${millId} AND c.status = 'confirmed'
    GROUP BY u.id, u.name
    ORDER BY (SUM(CASE WHEN c.auto_accepted THEN 1 ELSE 0 END)::float / COUNT(*)) DESC
  `);
  return result.rows.map((r) => {
    const total = Number(r.total);
    const autoAccepted = Number(r.auto_accepted);
    return {
      userId: r.user_id,
      userName: r.name,
      total,
      autoAccepted,
      ratePct: total > 0 ? (autoAccepted / total) * 100 : 0,
    };
  });
}

export type ComplianceAlert = {
  id: string;
  label: string;
  expiresOn: Date;
  tone: "wip" | "alert";
};

// UI spec §6.7a: "any document inside its reminder window appears as a line
// under the metric tiles, plain text, no red unless inside 7 days."
export async function getComplianceAlerts(millId: string): Promise<ComplianceAlert[]> {
  const rows = await db
    .select()
    .from(complianceDoc)
    .where(eq(complianceDoc.millId, millId));

  return rows
    .filter((r) => r.expiresOn)
    .map((r) => ({ id: r.id, label: r.label, expiresOn: new Date(r.expiresOn!) }))
    .map((r) => ({ ...r, tone: complianceTone(r.expiresOn) }))
    .filter((r): r is ComplianceAlert => r.tone === "wip" || r.tone === "alert")
    .sort((a, b) => a.expiresOn.getTime() - b.expiresOn.getTime());
}
