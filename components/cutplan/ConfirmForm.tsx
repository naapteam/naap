"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sawnCft } from "@/lib/volume";
import { formatCft } from "@/lib/i18n/format";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { VARIANCE_REASONS } from "@/lib/cutplan/confirmSchema";

type Target = {
  id: string;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  predictedQuantity: number;
};

export function ConfirmForm({
  conversionId,
  lotId,
  lotCode,
  speciesName,
  speciesColour,
  predictedOutputLow,
  predictedOutputHigh,
  predictedOffcut,
  predictedByproduct,
  inputCft,
  targets,
}: {
  conversionId: string;
  lotId: string;
  lotCode: string;
  speciesName: string;
  speciesColour: string;
  predictedOutputLow: number;
  predictedOutputHigh: number;
  predictedOffcut: number;
  predictedByproduct: number;
  inputCft: number;
  targets: Target[];
}) {
  const t = useTranslations("cutPlan.confirm");
  const router = useRouter();

  const [actuals, setActuals] = useState<Record<string, string>>(
    Object.fromEntries(targets.map((t) => [t.id, String(t.predictedQuantity)])),
  );
  const [offcutCft, setOffcutCft] = useState(String(predictedOffcut));
  const [byproductCft, setByproductCft] = useState(String(predictedByproduct));
  const [varianceReason, setVarianceReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ recoveryPct: number; autoAccepted: boolean } | null>(null);

  const rows = useMemo(
    () =>
      targets.map((target) => {
        const perPieceCft = sawnCft(target.thicknessMm, target.widthMm, target.lengthMm);
        const actualQuantity = Number(actuals[target.id] || 0);
        const volumeCft = perPieceCft * actualQuantity;
        const tolerance = Math.max(1, Math.round(target.predictedQuantity * 0.15));
        const inRange = Math.abs(actualQuantity - target.predictedQuantity) <= tolerance;
        return { target, perPieceCft, actualQuantity, volumeCft, inRange };
      }),
    [targets, actuals],
  );

  const actualOutputCft = rows.reduce((s, r) => s + r.volumeCft, 0);
  const recoveryPct = inputCft > 0 ? (actualOutputCft / inputCft) * 100 : 0;
  const outsideRange = actualOutputCft < predictedOutputLow || actualOutputCft > predictedOutputHigh;
  const gapCft = actualOutputCft - predictedOutputLow;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cutplan/${conversionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetActuals: targets.map((target) => ({
            conversionTargetId: target.id,
            actualQuantity: Number(actuals[target.id] || 0),
          })),
          actualOffcutCft: Number(offcutCft || 0),
          actualByproductCft: Number(byproductCft || 0),
          varianceReason: varianceReason ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDone({ recoveryPct: data.recoveryPct, autoAccepted: data.autoAccepted });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cutplan/${conversionId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/cut-plan");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6">
        <p className="text-[17px] text-[#14171A]">
          {t("confirmed", { recovery: done.recoveryPct.toFixed(1) })}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/stock/lot/${lotId}`)}
          className="h-10 w-fit rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A]"
        >
          {t("backToStock")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-semibold text-[#14171A]">{lotCode}</h1>
        <SpeciesChip name={speciesName} colorHex={speciesColour} />
        <span className="text-sm text-[#4A5057]">
          {t("predicted")} {formatCft(predictedOutputLow)} – {formatCft(predictedOutputHigh)} CFT
        </span>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("size")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("predictedCol")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("actualCol")}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.target.id} className="h-10 border-b border-[#C9CFD4]">
              <td className="px-2 tabular-nums text-[#14171A]">
                {Math.round(r.target.thicknessMm / 25.4)}×{Math.round(r.target.widthMm / 25.4)}×
                {Math.round((r.target.lengthMm / 304.8) * 10) / 10}ft
              </td>
              <td className="px-2 text-right tabular-nums text-[#4A5057]">
                {r.target.predictedQuantity}
              </td>
              <td className="px-2 text-right">
                <input
                  type="number"
                  min={0}
                  value={actuals[r.target.id]}
                  onChange={(e) => setActuals((prev) => ({ ...prev, [r.target.id]: e.target.value }))}
                  className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-right tabular-nums"
                />
              </td>
              <td className="px-2 text-center text-[17px]">
                {r.inRange ? (
                  <span className="text-[#1F7A4D]">✓</span>
                ) : (
                  <span className="text-[#B5730E]">▲</span>
                )}
              </td>
            </tr>
          ))}
          <tr className="h-10 border-b border-[#C9CFD4]">
            <td className="px-2 text-[#14171A]">{t("offcuts")}</td>
            <td className="px-2 text-right tabular-nums text-[#4A5057]">
              {formatCft(predictedOffcut)}
            </td>
            <td className="px-2 text-right">
              <input
                type="number"
                min={0}
                step="0.01"
                value={offcutCft}
                onChange={(e) => setOffcutCft(e.target.value)}
                className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-right tabular-nums"
              />
            </td>
            <td />
          </tr>
          <tr className="h-10 border-b border-[#C9CFD4]">
            <td className="px-2 text-[#14171A]">{t("byproduct")}</td>
            <td className="px-2 text-right tabular-nums text-[#4A5057]">
              {formatCft(predictedByproduct)}
            </td>
            <td className="px-2 text-right">
              <input
                type="number"
                min={0}
                step="0.01"
                value={byproductCft}
                onChange={(e) => setByproductCft(e.target.value)}
                className="h-9 w-20 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-right tabular-nums"
              />
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      <div className="flex gap-8">
        <div>
          <p className="text-sm text-[#4A5057]">{t("actualOutput")}</p>
          <p className="text-[24px] font-semibold tabular-nums text-[#14171A]">
            {formatCft(actualOutputCft)} CFT
          </p>
        </div>
        <div>
          <p className="text-sm text-[#4A5057]">{t("recovery")}</p>
          <p className="text-[24px] font-semibold tabular-nums text-[#14171A]">
            {recoveryPct.toFixed(1)}%
          </p>
        </div>
        {outsideRange && (
          <div>
            <p className="text-sm text-[#4A5057]">
              {gapCft < 0 ? t("belowRangeBy") : t("aboveRangeBy")}
            </p>
            <p className="text-[24px] font-semibold tabular-nums text-[#C03028]">
              {formatCft(Math.abs(gapCft))} CFT
            </p>
          </div>
        )}
      </div>

      {outsideRange && (
        <div>
          <p className="mb-2 text-sm text-[#4A5057]">{t("whyLower")}</p>
          <div className="flex flex-wrap gap-2">
            {VARIANCE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setVarianceReason(reason)}
                className={`h-9 rounded-full border-[1.5px] px-3 text-sm ${
                  varianceReason === reason
                    ? "border-[#C03028] bg-[#C03028] text-white"
                    : "border-[#C9CFD4] text-[#14171A]"
                }`}
              >
                {t(`reason.${reason}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#C03028]" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A] disabled:opacity-60"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || (outsideRange && !varianceReason)}
          className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? t("confirming") : t("confirm")}
        </button>
      </div>
    </div>
  );
}
