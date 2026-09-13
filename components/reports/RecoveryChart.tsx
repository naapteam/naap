"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

// Single series (recovery % by month) — one hue, no legend needed per the
// dataviz skill's rule that a lone series carries its own identity via the
// chart title, not color.
const SEQUENTIAL_BLUE = "#2a78d6";

export function RecoveryChart({ data }: { data: { month: string; recoveryPct: number }[] }) {
  if (data.length === 0) return null;
  return (
    <BarChart width={600} height={240} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#4A5057" }} />
      <YAxis
        tick={{ fontSize: 12, fill: "#4A5057" }}
        tickFormatter={(v) => `${v}%`}
        width={40}
      />
      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Recovery"]} />
      <Bar dataKey="recoveryPct" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}
