"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import type { Reconciliation } from "@/lib/reports/queries";

// Validated 4-slot categorical set (dataviz skill reference palette, slots
// 1-4 in their documented order — reordering would break the CVD guarantee).
const COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#eb6834"];

export function ReconciliationChart({ data }: { data: Reconciliation }) {
  const rows = [
    { name: "Intake", value: data.intakeCft },
    { name: "Output", value: data.outputCft },
    { name: "Byproduct", value: data.byproductCft },
    { name: "Dispatched", value: data.dispatchedCft },
  ];
  return (
    <BarChart width={600} height={240} data={rows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4A5057" }} />
      <YAxis tick={{ fontSize: 12, fill: "#4A5057" }} width={50} />
      <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} CFT`, ""]} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
        {rows.map((r, i) => (
          <Cell key={r.name} fill={COLORS[i]} />
        ))}
        <LabelList
          dataKey="value"
          position="top"
          formatter={(v: React.ReactNode) => Number(v).toFixed(1)}
          style={{ fill: "#14171A", fontSize: 12 }}
        />
      </Bar>
    </BarChart>
  );
}
