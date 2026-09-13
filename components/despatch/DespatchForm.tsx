"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatCft } from "@/lib/i18n/format";
import { formatPieceSize } from "@/lib/stock/format";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { TotalsBar } from "@/components/ui/TotalsBar";
import { TypeAhead } from "@/components/ui/TypeAhead";
import { useRateLock } from "@/components/RateLockProvider";
import { encryptWithRateKey } from "@/lib/crypto/rateLock";

type StockItem = {
  id: string;
  form: string;
  girthMm: number | null;
  lengthMm: number | null;
  thicknessMm: number | null;
  widthMm: number | null;
  volumeCft: string;
  speciesNameEn: string | null;
  speciesColour: string | null;
  bayCode: string | null;
};

type Customer = { id: string; name: string };

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DespatchForm({
  stock,
  customers,
  isOwner = false,
}: {
  stock: StockItem[];
  customers: Customer[];
  isOwner?: boolean;
}) {
  const t = useTranslations("despatch");
  const router = useRouter();
  const rateLock = useRateLock();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [vehicleNo, setVehicleNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [tpNumber, setTpNumber] = useState("");
  const [dispatchedAt, setDispatchedAt] = useState("");
  // Kept out of persisted state — a plaintext rate must never touch disk
  // (architecture §8); this form has no draft autosave, but keep the same
  // discipline as IntakeWizard so a future autosave addition can't leak it.
  const [rate, setRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    setDispatchedAt(toLocalDatetimeInput(new Date()));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = stock.filter((s) => selected.has(s.id));
  const totalCft = selectedItems.reduce((s, p) => s + Number(p.volumeCft), 0);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let rateCiphertext: string | undefined;
      let rateIv: string | undefined;
      if (isOwner && rateLock.unlocked && rateLock.key && rate.trim()) {
        const enc = await encryptWithRateKey(rateLock.key, rate.trim());
        rateCiphertext = enc.ciphertext;
        rateIv = enc.iv;
      }
      const res = await fetch("/api/despatch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          vehicleNo: vehicleNo || undefined,
          challanNo: challanNo || undefined,
          tpNumber: tpNumber || undefined,
          dispatchedAt: dispatchedAt ? new Date(dispatchedAt).toISOString() : new Date().toISOString(),
          pieceIds: [...selected],
          rateCiphertext,
          rateIv,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setRate("");
      setResult(data.despatchId);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6">
        <p className="text-[17px] text-[#14171A]">{t("recorded")}</p>
        <div className="flex gap-3">
          <a
            href={`/despatch/${result}/slip`}
            target="_blank"
            rel="noreferrer"
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold leading-10 text-[#14171A]"
          >
            {t("printChallan")}
          </a>
          <button
            type="button"
            onClick={() => router.push("/despatch")}
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
      <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>

      <div className="flex flex-wrap gap-4 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <Field label={t("customer")}>
          <TypeAhead
            name="customerId"
            options={customers.map((c) => ({ id: c.id, label: c.name }))}
            onSelect={(o) => setCustomerId(o.id)}
          />
        </Field>
        <Field label={t("vehicleNo")}>
          <input
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </Field>
        <Field label={t("challanNo")}>
          <input
            value={challanNo}
            onChange={(e) => setChallanNo(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </Field>
        <Field label={t("tpNumber")}>
          <input
            value={tpNumber}
            onChange={(e) => setTpNumber(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </Field>
        <Field label={t("date")}>
          <input
            type="datetime-local"
            value={dispatchedAt}
            onChange={(e) => setDispatchedAt(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums outline-none focus:border-[#8B949C]"
          />
        </Field>
        {isOwner && rateLock.enabled && rateLock.unlocked && (
          <Field label={t("yourRate")} hint={t("yourRateHint")}>
            <input
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
            />
          </Field>
        )}
        {isOwner && rateLock.enabled && !rateLock.unlocked && (
          <p className="self-end text-sm text-[#4A5057]">{t("yourRateLocked")}</p>
        )}
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="w-10 px-2 py-1" />
            <th className="px-2 py-1 font-normal">{t("species")}</th>
            <th className="px-2 py-1 font-normal">{t("form")}</th>
            <th className="px-2 py-1 font-normal">{t("size")}</th>
            <th className="px-2 py-1 font-normal">{t("bay")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("cft")}</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr
              key={s.id}
              onClick={() => toggle(s.id)}
              className="h-10 cursor-pointer border-b border-[#C9CFD4] hover:bg-[#F2F4F5]"
            >
              <td className="px-2">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4"
                />
              </td>
              <td className="px-2 text-[17px] text-[#14171A]">
                {s.speciesNameEn ? (
                  <SpeciesChip name={s.speciesNameEn} colorHex={s.speciesColour ?? "#8B949C"} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-2 text-[17px] text-[#14171A]">{s.form}</td>
              <td className="px-2 text-[17px] tabular-nums text-[#14171A]">{formatPieceSize(s)}</td>
              <td className="px-2 text-[17px] text-[#14171A]">{s.bayCode ?? "—"}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {formatCft(Number(s.volumeCft))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {stock.length === 0 && <p className="text-[#4A5057]">{t("empty")}</p>}

      <TotalsBar
        items={[
          { label: t("selected"), value: String(selectedItems.length) },
          { label: t("totalCft"), value: `${formatCft(totalCft)} CFT` },
        ]}
      />

      {error && (
        <p className="text-sm text-[#C03028]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || selectedItems.length === 0}
        className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-40"
      >
        {submitting ? t("recording") : t("record")}
      </button>
    </div>
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
