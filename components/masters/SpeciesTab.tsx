"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { upsertSpeciesAction, type ActionState } from "@/lib/masters/actions";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import type { species as speciesTable } from "@/lib/db/schema";

type SpeciesRow = typeof speciesTable.$inferSelect;

const initialState: ActionState = {};

export function SpeciesTab({ rows }: { rows: SpeciesRow[] }) {
  const t = useTranslations("masters.species");
  const [editing, setEditing] = useState<SpeciesRow | null>(null);
  const [state, formAction, pending] = useActionState(upsertSpeciesAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h2>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("name")}</th>
            <th className="px-2 py-1 font-normal">{t("code")}</th>
            <th className="px-2 py-1 font-normal">{t("convention")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("recoveryBand")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("byproduct")}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="h-10 border-b border-[#C9CFD4]">
              <td className="px-2">
                <SpeciesChip name={s.nameEn} colorHex={s.colourHex} />
              </td>
              <td className="px-2 tabular-nums text-[#14171A]">{s.code}</td>
              <td className="px-2 text-[#14171A]">{s.defaultConvention}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {s.recoveryLow}–{s.recoveryHigh}%
              </td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">{s.byproductPct}%</td>
              <td className="px-2 text-right">
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="text-sm text-[#1B6BB8]"
                >
                  {t("edit")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        action={formAction}
        key={editing?.id ?? "new"}
        className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4"
      >
        <h3 className="text-sm font-semibold text-[#4A5057]">
          {editing ? t("editTitle", { name: editing.nameEn }) : t("addTitle")}
        </h3>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t("nameEn")}>
            <input name="nameEn" defaultValue={editing?.nameEn} required className={inputClass} />
          </Field>
          <Field label={t("nameHi")}>
            <input name="nameHi" defaultValue={editing?.nameHi ?? ""} className={inputClass} />
          </Field>
          <Field label={t("nameMr")}>
            <input name="nameMr" defaultValue={editing?.nameMr ?? ""} className={inputClass} />
          </Field>
          <Field label={t("nameGu")}>
            <input name="nameGu" defaultValue={editing?.nameGu ?? ""} className={inputClass} />
          </Field>
          <Field label={t("code")}>
            <input name="code" defaultValue={editing?.code} required maxLength={6} className={inputClass} />
          </Field>
          <Field label={t("colour")}>
            <input
              type="color"
              name="colourHex"
              defaultValue={editing?.colourHex ?? "#8B5E34"}
              className="h-10 w-full rounded-md border-[1.5px] border-[#C9CFD4]"
            />
          </Field>
          <Field label={t("convention")}>
            <select
              name="defaultConvention"
              defaultValue={editing?.defaultConvention ?? "hoppus"}
              className={inputClass}
            >
              <option value="hoppus">Hoppus</option>
              <option value="true">True</option>
              <option value="cbm">CBM</option>
            </select>
          </Field>
          <Field label={t("recoveryLow")}>
            <input
              type="number"
              name="recoveryLow"
              defaultValue={editing?.recoveryLow}
              required
              className={inputClass}
            />
          </Field>
          <Field label={t("recoveryHigh")}>
            <input
              type="number"
              name="recoveryHigh"
              defaultValue={editing?.recoveryHigh}
              required
              className={inputClass}
            />
          </Field>
          <Field label={t("byproduct")}>
            <input
              type="number"
              name="byproductPct"
              defaultValue={editing?.byproductPct ?? 18}
              className={inputClass}
            />
          </Field>
          <Field label={t("minOffcutLength")}>
            <input
              type="number"
              name="minOffcutLengthMm"
              defaultValue={editing?.minOffcutLengthMm ?? 450}
              className={inputClass}
            />
          </Field>
          <Field label={t("minOffcutWidth")}>
            <input
              type="number"
              name="minOffcutWidthMm"
              defaultValue={editing?.minOffcutWidthMm ?? 50}
              className={inputClass}
            />
          </Field>
        </div>
        {state.error && (
          <p className="text-sm text-[#C03028]" role="alert">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("saving") : t("save")}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-10 w-fit rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A]"
            >
              {t("cancelEdit")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
      {label}
      {children}
    </label>
  );
}
