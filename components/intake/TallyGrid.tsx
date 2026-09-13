"use client";

import { useTranslations } from "next-intl";
import { MM_PER_FOOT, MM_PER_INCH, hoppusCft } from "@/lib/volume";
import { formatCft } from "@/lib/i18n/format";
import { TotalsBar } from "@/components/ui/TotalsBar";

export type TallyRow = { girth: string; length: string };
export type Mode = "piece" | "bulk";

function rowCft(row: TallyRow): number | null {
  const girth = Number(row.girth);
  const length = Number(row.length);
  if (!girth || !length) return null;
  return hoppusCft(girth * MM_PER_INCH, length * MM_PER_FOOT);
}

export function TallyGrid({
  mode,
  onModeChange,
  rows,
  onRowsChange,
  bulkPieces,
  bulkCft,
  onBulkPiecesChange,
  onBulkCftChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  rows: TallyRow[];
  onRowsChange: (rows: TallyRow[]) => void;
  bulkPieces: string;
  bulkCft: string;
  onBulkPiecesChange: (v: string) => void;
  onBulkCftChange: (v: string) => void;
}) {
  const t = useTranslations("intake.wizard");

  function updateRow(index: number, patch: Partial<TallyRow>) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    // Auto-append a blank trailing row once the last one is filled in.
    const last = next[next.length - 1];
    if (last && last.girth && last.length) {
      next.push({ girth: "", length: "" });
    }
    onRowsChange(next);
  }

  function repeatAbove(index: number) {
    if (index === 0) return;
    updateRow(index, { ...rows[index - 1] });
  }

  const validRows = rows.filter((r) => r.girth && r.length);
  const totalCft = validRows.reduce((s, r) => s + (rowCft(r) ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#4A5057]">{t("mode")}:</span>
        <div className="flex overflow-hidden rounded-md border-[1.5px] border-[#C9CFD4]">
          {(["piece", "bulk"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`h-9 px-3 text-sm font-semibold ${
                mode === m ? "bg-[#1B6BB8] text-white" : "bg-white text-[#14171A]"
              }`}
            >
              {m === "piece" ? t("modePiece") : t("modeBulk")}
            </button>
          ))}
        </div>
      </div>

      {mode === "bulk" ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("bulkPieces")}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={bulkPieces}
              onChange={(e) => onBulkPiecesChange(e.target.value)}
              className="h-10 w-40 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums outline-none focus:border-[#8B949C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("bulkCft")}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={bulkCft}
              onChange={(e) => onBulkCftChange(e.target.value)}
              className="h-10 w-40 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums outline-none focus:border-[#8B949C]"
            />
          </label>
        </div>
      ) : (
        <>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
                <th className="w-10 px-2 py-1 font-normal">#</th>
                <th className="px-2 py-1 font-normal">{t("girth")}</th>
                <th className="px-2 py-1 font-normal">{t("length")}</th>
                <th className="px-2 py-1 text-right font-normal">{t("cftColumn")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const cft = rowCft(row);
                return (
                  <tr key={i} className="h-10 border-b border-[#C9CFD4]">
                    <td className="px-2 text-sm tabular-nums text-[#4A5057]">{i + 1}</td>
                    <td className="px-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={row.girth}
                        onChange={(e) => updateRow(i, { girth: e.target.value })}
                        className="h-9 w-24 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums outline-none focus:border-[#8B949C]"
                      />
                    </td>
                    <td className="px-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={row.length}
                        onChange={(e) => updateRow(i, { length: e.target.value })}
                        className="h-9 w-24 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums outline-none focus:border-[#8B949C]"
                      />
                    </td>
                    <td className="px-2 text-right tabular-nums text-[#14171A]">
                      {cft !== null ? formatCft(cft) : "—"}
                    </td>
                    <td className="px-1 text-center">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => repeatAbove(i)}
                          title="Repeat row above"
                          className="text-[#4A5057]"
                        >
                          ⤓
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <TotalsBar
            items={[
              { label: t("totalPieces"), value: String(validRows.length) },
              { label: t("totalCft"), value: `${formatCft(totalCft)} CFT` },
            ]}
          />
        </>
      )}
    </div>
  );
}
