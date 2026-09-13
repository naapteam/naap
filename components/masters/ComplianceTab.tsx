"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createComplianceDocAction, type ActionState } from "@/lib/masters/actions";
import { complianceTone, daysUntil } from "@/lib/masters/compliance";
import { formatDate } from "@/lib/i18n/format";
import { StatusPill } from "@/components/ui/StatusPill";
import { COMPLIANCE_KINDS } from "@/lib/masters/schema";
import type { complianceDoc as complianceDocTable } from "@/lib/db/schema";

type ComplianceRow = typeof complianceDocTable.$inferSelect;

const initialState: ActionState = {};

export function ComplianceTab({ rows }: { rows: ComplianceRow[] }) {
  const t = useTranslations("masters.compliance");
  const [state, formAction, pending] = useActionState(createComplianceDocAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h2>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("label")}</th>
            <th className="px-2 py-1 font-normal">{t("number")}</th>
            <th className="px-2 py-1 font-normal">{t("expiresOn")}</th>
            <th className="px-2 py-1 font-normal">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const expiresOn = r.expiresOn ? new Date(r.expiresOn) : null;
            const tone = complianceTone(expiresOn);
            return (
              <tr key={r.id} className="h-10 border-b border-[#C9CFD4]">
                <td className="px-2 text-[#14171A]">{r.label}</td>
                <td className="px-2 text-[#14171A]">{r.number ?? "—"}</td>
                <td className="px-2 tabular-nums text-[#14171A]">
                  {expiresOn ? formatDate(expiresOn) : "—"}
                </td>
                <td className="px-2">
                  {tone && expiresOn && (
                    <StatusPill
                      tone={tone}
                      label={
                        daysUntil(expiresOn) < 0
                          ? t("expired")
                          : t("daysLeft", { days: daysUntil(expiresOn) })
                      }
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-[#4A5057]">{t("empty")}</p>}

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4"
      >
        <h3 className="text-sm font-semibold text-[#4A5057]">{t("addTitle")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t("kindLabel")}>
            <select name="kind" className={inputClass} defaultValue={COMPLIANCE_KINDS[0]}>
              {COMPLIANCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("label")}>
            <input name="label" required className={inputClass} />
          </Field>
          <Field label={t("number")}>
            <input name="number" className={inputClass} />
          </Field>
          <Field label={t("issuedOn")}>
            <input type="date" name="issuedOn" className={inputClass} />
          </Field>
          <Field label={t("expiresOn")}>
            <input type="date" name="expiresOn" className={inputClass} />
          </Field>
        </div>
        {state.error && (
          <p className="text-sm text-[#C03028]" role="alert">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("saving") : t("add")}
        </button>
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
