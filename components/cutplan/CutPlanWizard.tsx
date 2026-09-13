"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { predict, type DefectCode, type PredictResult } from "@/lib/predict";
import { sawnCft } from "@/lib/volume";
import { formatCft, formatDate } from "@/lib/i18n/format";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { RangeDisplay } from "@/components/ui/RangeDisplay";
import type { OffcutMatch } from "@/lib/cutplan/offcutMatcher";

type LotOption = {
  lotId: string;
  lotCode: string;
  speciesId: string;
  speciesNameEn: string | null;
  speciesColour: string | null;
  recoveryLow: string | null;
  recoveryHigh: string | null;
  byproductPct: string | null;
  pieceCount: number;
  totalCft: string;
  avgGirthMm: number | null;
  oldestCreatedAt: Date;
  defects: string[] | null;
};

type SizePresetOption = {
  id: string;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  label: string | null;
};

type TargetRow = {
  thicknessMm: string;
  widthMm: string;
  lengthMm: string;
  targetQuantity: string;
  matches: OffcutMatch[];
};

const emptyTarget: TargetRow = {
  thicknessMm: "",
  widthMm: "",
  lengthMm: "",
  targetQuantity: "",
  matches: [],
};

export function CutPlanWizard({
  lots,
  sizePresets,
}: {
  lots: LotOption[];
  sizePresets: SizePresetOption[];
}) {
  const t = useTranslations("cutPlan");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lotId, setLotId] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetRow[]>([{ ...emptyTarget }]);
  const [usedOffcutIds, setUsedOffcutIds] = useState<string[]>([]);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const lot = lots.find((l) => l.lotId === lotId) ?? null;

  async function fetchMatches(index: number) {
    if (!lot) return;
    const row = targets[index];
    const t = Number(row.thicknessMm);
    const w = Number(row.widthMm);
    const l = Number(row.lengthMm);
    if (!t || !w || !l) return;
    try {
      const res = await fetch("/api/cutplan/offcut-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: lot.speciesId, thicknessMm: t, widthMm: w, lengthMm: l }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTargets((prev) =>
        prev.map((r, i) => (i === index ? { ...r, matches: data.matches } : r)),
      );
    } catch {
      // offline or transient — matches just stay empty, non-fatal
    }
  }

  function updateTarget(index: number, patch: Partial<TargetRow>) {
    setTargets((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      const last = next[next.length - 1];
      if (last.thicknessMm && last.widthMm && last.lengthMm) {
        next.push({ ...emptyTarget });
      }
      return next;
    });
  }

  function insertPreset(preset: SizePresetOption) {
    setTargets((prev) => [
      ...prev.filter((r) => r.thicknessMm || r.widthMm || r.lengthMm),
      {
        thicknessMm: String(Math.round(preset.thicknessMm / 25.4)),
        widthMm: String(Math.round(preset.widthMm / 25.4)),
        lengthMm: String(Math.round((preset.lengthMm / 304.8) * 10) / 10),
        targetQuantity: "",
        matches: [],
      },
      { ...emptyTarget },
    ]);
  }

  const validTargets = targets.filter((r) => r.thicknessMm && r.widthMm && r.lengthMm);

  const prediction: PredictResult | null = useMemo(() => {
    if (!lot || validTargets.length === 0) return null;
    const defects = (lot.defects ?? []).filter((d): d is DefectCode =>
      ["end_checks", "sweep", "taper", "borer", "hollow", "stain"].includes(d),
    );
    return predict({
      inputCft: Number(lot.totalCft),
      species: {
        recoveryLow: Number(lot.recoveryLow ?? 50),
        recoveryHigh: Number(lot.recoveryHigh ?? 60),
        byproductPct: Number(lot.byproductPct ?? 18),
      },
      avgGirthMm: lot.avgGirthMm ?? 500,
      defects,
      targets: validTargets.map((r) => ({
        thicknessMm: Number(r.thicknessMm) * 25.4,
        widthMm: Number(r.widthMm) * 25.4,
        lengthMm: Number(r.lengthMm) * 304.8,
      })),
    });
  }, [lot, validTargets]);

  const offcutSavings = useMemo(() => {
    const allMatches = targets.flatMap((r) => r.matches);
    return allMatches
      .filter((m) => usedOffcutIds.includes(m.id))
      .reduce((s, m) => s + Number(m.volumeCft), 0);
  }, [targets, usedOffcutIds]);

  async function handleSave() {
    if (!lot || !prediction) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/cutplan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId: lot.lotId,
          targets: validTargets.map((r) => ({
            thicknessMm: Math.round(Number(r.thicknessMm) * 25.4),
            widthMm: Math.round(Number(r.widthMm) * 25.4),
            lengthMm: Math.round(Number(r.lengthMm) * 304.8),
            targetQuantity: r.targetQuantity ? Number(r.targetQuantity) : undefined,
          })),
          usedOffcutIds,
          predicted: {
            outputLow: prediction.outputLow,
            outputHigh: prediction.outputHigh,
            offcut: prediction.offcut,
            byproduct: prediction.byproduct,
            waste: prediction.waste,
            recoveryLow: prediction.recoveryLow,
            recoveryHigh: prediction.recoveryHigh,
          },
          basis: prediction.basis,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(data.conversionId);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6">
        <p className="text-[17px] text-[#14171A]">{t("saved")}</p>
        <div className="flex gap-3">
          <a
            href={`/cut-plan/${saved}/sheet`}
            target="_blank"
            rel="noreferrer"
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold leading-10 text-[#14171A]"
          >
            {t("printSheet")}
          </a>
          <button
            type="button"
            onClick={() => router.push("/cut-plan")}
            className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
          >
            {t("backToList")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm text-[#4A5057]">
        {[1, 2, 3].map((s) => (
          <span key={s} className={s === step ? "font-semibold text-[#14171A]" : ""}>
            {s}. {t(`step${s}Title`)}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lots.length === 0 && <p className="text-[#4A5057]">{t("noLots")}</p>}
          {lots.map((l) => (
            <button
              key={l.lotId}
              type="button"
              onClick={() => {
                setLotId(l.lotId);
                setStep(2);
              }}
              className="flex flex-col gap-2 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4 text-left hover:border-[#8B949C]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-semibold text-[#14171A]">{l.lotCode}</span>
                {l.speciesNameEn && (
                  <SpeciesChip name={l.speciesNameEn} colorHex={l.speciesColour ?? "#8B949C"} />
                )}
              </div>
              <p className="text-sm text-[#4A5057]">
                {l.pieceCount} {t("pieces")} · {formatCft(Number(l.totalCft))} CFT
              </p>
              <p className="text-sm text-[#4A5057]">
                {t("since")} {formatDate(l.oldestCreatedAt)}
              </p>
              {l.defects && l.defects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {l.defects.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-[#F2F4F5] px-2 py-0.5 text-xs text-[#4A5057]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && lot && (
        <div className="flex flex-col gap-4">
          {sizePresets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizePresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => insertPreset(p)}
                  className="h-9 rounded-full border-[1.5px] border-[#C9CFD4] px-3 text-sm text-[#14171A]"
                >
                  {p.label ?? `${p.thicknessMm}×${p.widthMm}×${p.lengthMm}`}
                </button>
              ))}
            </div>
          )}

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
                <th className="px-2 py-1 font-normal">{t("thickness")}</th>
                <th className="px-2 py-1 font-normal">{t("width")}</th>
                <th className="px-2 py-1 font-normal">{t("length")}</th>
                <th className="px-2 py-1 font-normal">{t("targetQty")}</th>
                <th className="px-2 py-1 text-right font-normal">{t("cftColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((row, i) => {
                const t3 = Number(row.thicknessMm);
                const w3 = Number(row.widthMm);
                const l3 = Number(row.lengthMm);
                const qty = Number(row.targetQuantity) || 1;
                const cft =
                  t3 && w3 && l3
                    ? sawnCft(t3 * 25.4, w3 * 25.4, l3 * 304.8, qty)
                    : null;
                return (
                  <tr key={i} className="border-b border-[#C9CFD4]">
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.thicknessMm}
                        onChange={(e) => updateTarget(i, { thicknessMm: e.target.value })}
                        onBlur={() => fetchMatches(i)}
                        className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.widthMm}
                        onChange={(e) => updateTarget(i, { widthMm: e.target.value })}
                        onBlur={() => fetchMatches(i)}
                        className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.lengthMm}
                        onChange={(e) => updateTarget(i, { lengthMm: e.target.value })}
                        onBlur={() => fetchMatches(i)}
                        className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.targetQuantity}
                        onChange={(e) => updateTarget(i, { targetQuantity: e.target.value })}
                        className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {cft !== null ? formatCft(cft) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {validTargets.some((r) => r.matches.length > 0) && (
            <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#4A5057]">{t("offcutMatches")}</h3>
              {offcutSavings > 0 && (
                <p className="mb-2 text-sm text-[#1F7A4D]">
                  {t("offcutSavings", { cft: formatCft(offcutSavings) })}
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {validTargets.flatMap((r) => r.matches).map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-[17px]">
                    <span>
                      {m.thicknessMm}×{m.widthMm}×{m.lengthMm}mm · {formatCft(Number(m.volumeCft))} CFT ·{" "}
                      {m.bayCode ?? "—"} · {m.ageDays}d
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUsedOffcutIds((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                        )
                      }
                      className={`h-8 rounded-md border-[1.5px] px-3 text-sm font-semibold ${
                        usedOffcutIds.includes(m.id)
                          ? "border-[#1F7A4D] bg-[#1F7A4D] text-white"
                          : "border-[#C9CFD4] text-[#14171A]"
                      }`}
                    >
                      {t("useThese")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A]"
            >
              {t("back")}
            </button>
            <button
              type="button"
              disabled={validTargets.length === 0}
              onClick={() => setStep(3)}
              className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}

      {step === 3 && lot && prediction && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-5">
            <p className="text-sm text-[#4A5057]">{t("input")}</p>
            <p className="mb-3 text-[24px] font-semibold tabular-nums text-[#14171A]">
              {formatCft(Number(lot.totalCft))} CFT
            </p>

            <p className="text-sm text-[#4A5057]">{t("expectedOutput")}</p>
            <RangeDisplay
              low={prediction.outputLow}
              high={prediction.outputHigh}
              unit="CFT"
              secondary={`${prediction.recoveryLow.toFixed(0)}% – ${prediction.recoveryHigh.toFixed(0)}%`}
            />

            <div className="mt-4 grid grid-cols-3 gap-4">
              <Stat label={t("offcutStat")} value={`${formatCft(prediction.offcut)} CFT`} />
              <Stat label={t("byproductStat")} value={`${formatCft(prediction.byproduct)} CFT`} />
              <Stat label={t("wasteStat")} value={`${formatCft(prediction.waste)} CFT`} />
            </div>

            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="mt-4 text-sm text-[#1B6BB8]"
            >
              {t("whyThisRange")} [{showWhy ? t("hide") : t("show")}]
            </button>
            {showWhy && (
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <WhyRow
                  label={t("speciesBand")}
                  value={`${prediction.basis.speciesLow}% – ${prediction.basis.speciesHigh}%`}
                />
                {prediction.basis.diaBonus !== 0 && (
                  <WhyRow
                    label={prediction.basis.diaBonus > 0 ? t("largeLogs") : t("smallLogs")}
                    value={`${prediction.basis.diaBonus > 0 ? "+" : ""}${prediction.basis.diaBonus}`}
                  />
                )}
                {prediction.basis.sizePenalty > 0 && (
                  <WhyRow label={t("sizePenalty")} value={`-${prediction.basis.sizePenalty}`} />
                )}
                {prediction.basis.defectBreakdown.map((d) => (
                  <WhyRow
                    key={d.code}
                    label={t(`defect.${d.code}`)}
                    value={`-${d.deduction}`}
                  />
                ))}
              </dl>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-[#C03028]" role="alert">
              {saveError}
            </p>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A]"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-60"
            >
              {saving ? t("saving") : t("savePlan")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#4A5057]">{label}</p>
      <p className="text-[17px] font-semibold tabular-nums text-[#14171A]">{value}</p>
    </div>
  );
}

function WhyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[#4A5057]">{label}</dt>
      <dd className="tabular-nums text-[#14171A]">{value}</dd>
    </div>
  );
}
