"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDraft } from "@/lib/offline/useDraft";
import { useOutbox } from "@/components/OutboxProvider";
import { TypeAhead } from "@/components/ui/TypeAhead";
import { TallyGrid, type Mode, type TallyRow } from "./TallyGrid";
import { formatCft } from "@/lib/i18n/format";
import { MM_PER_FOOT, MM_PER_INCH, hoppusCft } from "@/lib/volume";
import { DEFECT_CODES } from "@/lib/intake/schema";
import type { CloseIntakePayload } from "@/lib/intake/schema";

type Supplier = { id: string; name: string };
type SpeciesOption = { id: string; nameEn: string; colourHex: string };
type Bay = { id: string; code: string };

type Draft = {
  step: 1 | 2 | 3 | 4;
  supplierId: string;
  supplierLabel: string;
  vehicleNo: string;
  tpNumber: string;
  tpExpiry: string;
  arrivedAt: string;
  declaredPieces: string;
  declaredCft: string;
  defects: string[];
  speciesId: string;
  speciesLabel: string;
  mode: Mode;
  tallyRows: TallyRow[];
  bulkPieces: string;
  bulkCft: string;
  bayId: string;
  bayLabel: string;
  varianceNote: string;
};

const initialDraft: Draft = {
  step: 1,
  supplierId: "",
  supplierLabel: "",
  vehicleNo: "",
  tpNumber: "",
  tpExpiry: "",
  arrivedAt: "",
  declaredPieces: "",
  declaredCft: "",
  defects: [],
  speciesId: "",
  speciesLabel: "",
  mode: "piece",
  tallyRows: [{ girth: "", length: "" }],
  bulkPieces: "",
  bulkCft: "",
  bayId: "",
  bayLabel: "",
  varianceNote: "",
};

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function IntakeWizard({
  suppliers,
  speciesList,
  bays,
}: {
  suppliers: Supplier[];
  speciesList: SpeciesOption[];
  bays: Bay[];
}) {
  const t = useTranslations("intake.wizard");
  const router = useRouter();
  const outbox = useOutbox();
  const [draft, setDraft, clearDraft] = useDraft<Draft>("intake-new", initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<
    { lotCode: string; offline: boolean } | null
  >(null);

  useEffect(() => {
    if (!draft.arrivedAt) {
      setDraft((d) => ({ ...d, arrivedAt: toLocalDatetimeInput(new Date()) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const talliedCft =
    draft.mode === "piece"
      ? draft.tallyRows
          .filter((r) => r.girth && r.length)
          .reduce((s, r) => {
            const girth = Number(r.girth);
            const length = Number(r.length);
            return (
              s + (girth && length ? hoppusCft(girth * MM_PER_INCH, length * MM_PER_FOOT) : 0)
            );
          }, 0)
      : Number(draft.bulkCft || 0);

  const declaredCft = Number(draft.declaredCft || 0);
  const gapPct =
    declaredCft > 0 ? (Math.abs(talliedCft - declaredCft) / declaredCft) * 100 : 0;
  const needsVarianceNote = declaredCft > 0 && gapPct > 5;

  async function handleClose() {
    setSubmitError(null);
    if (needsVarianceNote && !draft.varianceNote.trim()) {
      setSubmitError(t("varianceNoteHint"));
      return;
    }
    if (!draft.speciesId) {
      setSubmitError(t("species"));
      return;
    }

    const payload: CloseIntakePayload = {
      supplierId: draft.supplierId || null,
      vehicleNo: draft.vehicleNo || undefined,
      tpNumber: draft.tpNumber || undefined,
      tpExpiry: draft.tpExpiry || undefined,
      declaredPieces: draft.declaredPieces ? Number(draft.declaredPieces) : undefined,
      declaredCft: draft.declaredCft ? Number(draft.declaredCft) : undefined,
      arrivedAt: draft.arrivedAt
        ? new Date(draft.arrivedAt).toISOString()
        : new Date().toISOString(),
      defects: draft.defects as CloseIntakePayload["defects"],
      speciesId: draft.speciesId,
      mode: draft.mode,
      tallyRows:
        draft.mode === "piece"
          ? draft.tallyRows
              .filter((r) => r.girth && r.length)
              .map((r) => ({
                girthMm: Math.round(Number(r.girth) * 25.4),
                lengthMm: Math.round(Number(r.length) * 304.8),
              }))
          : undefined,
      bulk:
        draft.mode === "bulk"
          ? {
              pieces: draft.bulkPieces ? Number(draft.bulkPieces) : undefined,
              cft: Number(draft.bulkCft || 0),
            }
          : undefined,
      bayId: draft.bayId || null,
      varianceNote: draft.varianceNote || undefined,
    };

    setSubmitting(true);
    const res = await outbox.submit({
      url: "/api/intake/close",
      method: "POST",
      body: payload,
      label: "Close intake",
    });
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(res.error);
      return;
    }
    clearDraft();
    if (res.queued) {
      setResult({ lotCode: "", offline: true });
    } else {
      const data = res.data as { lotCode: string };
      setResult({ lotCode: data.lotCode, offline: false });
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6">
        <p className="text-[17px] text-[#14171A]">
          {result.offline ? t("savedOffline") : t("success", { lotCode: result.lotCode })}
        </p>
        <button
          type="button"
          onClick={() => router.push("/intake")}
          className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
        >
          {t("backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm text-[#4A5057]">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={s === draft.step ? "font-semibold text-[#14171A]" : ""}
          >
            {s}. {t(`step${s}Title`)}
          </span>
        ))}
      </div>

      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-5">
        {draft.step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label={t("supplier")}>
              <TypeAhead
                name="supplierId"
                options={suppliers.map((s) => ({ id: s.id, label: s.name }))}
                defaultOption={
                  draft.supplierId
                    ? { id: draft.supplierId, label: draft.supplierLabel }
                    : undefined
                }
                onSelect={(o) => patch({ supplierId: o.id, supplierLabel: o.label })}
              />
            </Field>
            <Field label={t("vehicleNo")}>
              <TextInput
                value={draft.vehicleNo}
                onChange={(v) => patch({ vehicleNo: v })}
              />
            </Field>
            <Field label={t("tpNumber")}>
              <TextInput value={draft.tpNumber} onChange={(v) => patch({ tpNumber: v })} />
            </Field>
            <Field label={t("tpExpiry")}>
              <input
                type="date"
                value={draft.tpExpiry}
                onChange={(e) => patch({ tpExpiry: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("arrivedAt")}>
              <input
                type="datetime-local"
                value={draft.arrivedAt}
                onChange={(e) => patch({ arrivedAt: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("declaredPieces")}>
              <input
                type="number"
                inputMode="numeric"
                value={draft.declaredPieces}
                onChange={(e) => patch({ declaredPieces: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("declaredCft")} hint={t("declaredHint")}>
              <input
                type="number"
                inputMode="decimal"
                value={draft.declaredCft}
                onChange={(e) => patch({ declaredCft: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {draft.step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#4A5057]">{t("defectHint")}</p>
            <div className="flex flex-wrap gap-2">
              {DEFECT_CODES.map((code) => {
                const active = draft.defects.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      patch({
                        defects: active
                          ? draft.defects.filter((d) => d !== code)
                          : [...draft.defects, code],
                      })
                    }
                    className={`h-10 rounded-full border-[1.5px] px-4 text-[17px] ${
                      active
                        ? "border-[#B5730E] bg-[#B5730E] text-white"
                        : "border-[#C9CFD4] bg-white text-[#14171A]"
                    }`}
                  >
                    {t(`defect.${code}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div className="flex flex-col gap-4">
            <Field label={t("species")}>
              <TypeAhead
                name="speciesId"
                options={speciesList.map((s) => ({ id: s.id, label: s.nameEn }))}
                defaultOption={
                  draft.speciesId
                    ? { id: draft.speciesId, label: draft.speciesLabel }
                    : undefined
                }
                onSelect={(o) => patch({ speciesId: o.id, speciesLabel: o.label })}
              />
            </Field>
            <TallyGrid
              mode={draft.mode}
              onModeChange={(mode) => patch({ mode })}
              rows={draft.tallyRows}
              onRowsChange={(tallyRows) => patch({ tallyRows })}
              bulkPieces={draft.bulkPieces}
              bulkCft={draft.bulkCft}
              onBulkPiecesChange={(bulkPieces) => patch({ bulkPieces })}
              onBulkCftChange={(bulkCft) => patch({ bulkCft })}
            />
          </div>
        )}

        {draft.step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-[#4A5057]">{t("totalCft")}</p>
                <p className="text-[24px] font-semibold tabular-nums text-[#14171A]">
                  {formatCft(talliedCft)} CFT
                </p>
              </div>
              {declaredCft > 0 && (
                <div>
                  <p className="text-sm text-[#4A5057]">{t("declaredCft")}</p>
                  <p className="text-[24px] font-semibold tabular-nums text-[#14171A]">
                    {formatCft(declaredCft)} CFT
                  </p>
                </div>
              )}
            </div>
            <Field label={t("bay")}>
              <TypeAhead
                name="bayId"
                options={bays.map((b) => ({ id: b.id, label: b.code }))}
                defaultOption={
                  draft.bayId ? { id: draft.bayId, label: draft.bayLabel } : undefined
                }
                onSelect={(o) => patch({ bayId: o.id, bayLabel: o.label })}
              />
            </Field>
            {needsVarianceNote && (
              <Field label={t("varianceNote")} hint={t("varianceNoteHint")}>
                <textarea
                  value={draft.varianceNote}
                  onChange={(e) => patch({ varianceNote: e.target.value })}
                  className="min-h-20 rounded-md border-[1.5px] border-[#C9CFD4] p-3 text-[17px] outline-none focus:border-[#8B949C]"
                />
              </Field>
            )}
            {submitError && (
              <p className="text-sm text-[#C03028]" role="alert">
                {submitError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          disabled={draft.step === 1}
          onClick={() => patch({ step: (draft.step - 1) as Draft["step"] })}
          className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A] disabled:opacity-40"
        >
          {t("back")}
        </button>
        {draft.step < 4 ? (
          <button
            type="button"
            onClick={() => patch({ step: (draft.step + 1) as Draft["step"] })}
            className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
          >
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t("closing") : t("close")}
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums text-[#14171A] outline-none focus:border-[#8B949C]";

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
      {label}
      {children}
      {hint && <span className="text-xs">{hint}</span>}
    </label>
  );
}
