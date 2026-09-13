"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import type { DeadStockBand } from "@/lib/reports/queries";

// Ordinal sequential ramp (one hue, light -> dark) — older = darker, per
// dataviz skill's sequential-hue rule. Steps 250/400/550/700 from the
// reference blue ramp (step 250 is the lightest step that still clears
// 2:1 contrast for an ordinal/discrete ramp).
const SEQUENTIAL_STEPS = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];

export function DeadStockChart({ data }: { data: DeadStockBand[] }) {
  return (
    <BarChart width={600} height={240} data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
      <XAxis dataKey="band" tick={{ fontSize: 12, fill: "#4A5057" }} />
      <YAxis tick={{ fontSize: 12, fill: "#4A5057" }} width={50} />
      <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} CFT`, ""]} />
      <Bar dataKey="cft" radius={[4, 4, 0, 0]}>
        {data.map((d, i) => (
          <Cell key={d.band} fill={SEQUENTIAL_STEPS[i]} />
        ))}
        <LabelList
          dataKey="cft"
          position="top"
          formatter={(v: React.ReactNode) => Number(v).toFixed(1)}
          style={{ fill: "#14171A", fontSize: 12 }}
        />
      </Bar>
    </BarChart>
  );
}
