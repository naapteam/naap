"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { SupplierScoreRow } from "@/lib/reports/queries";

const SEQUENTIAL_BLUE = "#2a78d6";

export function SupplierChart({ data }: { data: SupplierScoreRow[] }) {
  if (data.length === 0) return null;
  return (
    <BarChart
      width={600}
      height={Math.max(160, data.length * 40)}
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
      <XAxis type="number" tick={{ fontSize: 12, fill: "#4A5057" }} tickFormatter={(v) => `${v}%`} />
      <YAxis
        type="category"
        dataKey="name"
        width={140}
        tick={{ fontSize: 12, fill: "#14171A" }}
      />
      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Avg recovery"]} />
      <Bar dataKey="avgRecoveryPct" fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} />
    </BarChart>
  );
}
