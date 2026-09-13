import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { formatCft, formatDate } from "@/lib/i18n/format";
import {
  getDeadStock,
  getRecoveryRows,
  getReconciliation,
  getSupplierScorecard,
  groupRecoveryByMonth,
} from "@/lib/reports/queries";
import { RecoveryChart } from "@/components/reports/RecoveryChart";
import { ReconciliationChart } from "@/components/reports/ReconciliationChart";
import { DeadStockChart } from "@/components/reports/DeadStockChart";
import { SupplierChart } from "@/components/reports/SupplierChart";
import { MetricTile } from "@/components/ui/MetricTile";

type Tab = "recovery" | "reconciliation" | "deadstock" | "suppliers";

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  const t = await getTranslations("reports");
  if (!session?.millId) return null;
  const millId = session.millId;

  const sp = await searchParams;
  const tab: Tab =
    sp.tab === "reconciliation" || sp.tab === "deadstock" || sp.tab === "suppliers"
      ? sp.tab
      : "recovery";

  const now = new Date();
  const from = sp.from ? new Date(sp.from) : firstOfMonth(now);
  const to = sp.to ? new Date(sp.to) : now;

  const tabs: Tab[] = ["recovery", "reconciliation", "deadstock", "suppliers"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>
        {(tab === "recovery" || tab === "reconciliation") && (
          <a
            href={`/api/reports/csv?type=${tab}&from=${toDateInput(from)}&to=${toDateInput(to)}`}
            className="text-sm text-[#1B6BB8]"
          >
            {t("exportCsv")}
          </a>
        )}
        {(tab === "deadstock" || tab === "suppliers") && (
          <a href={`/api/reports/csv?type=${tab}`} className="text-sm text-[#1B6BB8]">
            {t("exportCsv")}
          </a>
        )}
      </div>

      <div className="flex gap-1 border-b-[1.5px] border-[#C9CFD4]">
        {tabs.map((tk) => (
          <Link
            key={tk}
            href={`/reports?tab=${tk}`}
            className={`px-3 py-2 text-[17px] ${
              tab === tk
                ? "border-b-2 border-[#1B6BB8] font-semibold text-[#14171A]"
                : "text-[#4A5057]"
            }`}
          >
            {t(`tabs.${tk}`)}
          </Link>
        ))}
      </div>

      {(tab === "recovery" || tab === "reconciliation") && (
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value={tab} />
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("from")}
            <input
              type="date"
              name="from"
              defaultValue={toDateInput(from)}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("to")}
            <input
              type="date"
              name="to"
              defaultValue={toDateInput(to)}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
          >
            {t("apply")}
          </button>
        </form>
      )}

      {tab === "recovery" && <RecoveryTab millId={millId} from={from} to={to} t={t} />}
      {tab === "reconciliation" && (
        <ReconciliationTab millId={millId} from={from} to={to} t={t} />
      )}
      {tab === "deadstock" && <DeadStockTab millId={millId} t={t} />}
      {tab === "suppliers" && <SuppliersTab millId={millId} t={t} />}
    </div>
  );
}

async function RecoveryTab({
  millId,
  from,
  to,
  t,
}: {
  millId: string;
  from: Date;
  to: Date;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const rows = await getRecoveryRows(millId, from, to);
  const monthly = groupRecoveryByMonth(rows);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <RecoveryChart data={monthly} />
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("date")}</th>
            <th className="px-2 py-1 font-normal">{t("lot")}</th>
            <th className="px-2 py-1 font-normal">{t("species")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("input")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("output")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("recovery")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lotId} className="h-10 border-b border-[#C9CFD4]">
              <td className="px-2 tabular-nums text-[#14171A]">{formatDate(r.occurredAt)}</td>
              <td className="px-2">
                <a href={`/stock/lot/${r.lotId}`} className="text-[#1B6BB8]">
                  {r.lotCode}
                </a>
              </td>
              <td className="px-2 text-[#14171A]">{r.speciesNameEn}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {formatCft(r.inputCft)}
              </td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {formatCft(r.outputCft)}
              </td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {r.recoveryPct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-[#4A5057]">{t("noData")}</p>}
    </div>
  );
}

async function ReconciliationTab({
  millId,
  from,
  to,
  t,
}: {
  millId: string;
  from: Date;
  to: Date;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const r = await getReconciliation(millId, from, to);
  const hasUnexplained = Math.abs(r.unexplainedCft) > 0.5;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label={t("intake")} value={`${formatCft(r.intakeCft)} CFT`} />
        <MetricTile label={t("output")} value={`${formatCft(r.outputCft)} CFT`} />
        <MetricTile label={t("byproduct")} value={`${formatCft(r.byproductCft)} CFT`} />
        <MetricTile label={t("dispatched")} value={`${formatCft(r.dispatchedCft)} CFT`} />
      </div>
      {hasUnexplained && (
        <div className="rounded-md border-[1.5px] border-[#C03028] bg-white p-4">
          <p className="text-sm text-[#4A5057]">{t("unexplained")}</p>
          <p className="text-[36px] font-semibold tabular-nums text-[#C03028]">
            {formatCft(r.unexplainedCft)} CFT
          </p>
        </div>
      )}
      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <ReconciliationChart data={r} />
      </div>
    </div>
  );
}

async function DeadStockTab({
  millId,
  t,
}: {
  millId: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const bands = await getDeadStock(millId);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <DeadStockChart data={bands} />
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("ageBand")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("pieces")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("cft")}</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => (
            <tr key={b.band} className="h-10 border-b border-[#C9CFD4]">
              <td className="px-2 text-[#14171A]">{b.band}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">{b.pieces}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">{formatCft(b.cft)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function SuppliersTab({
  millId,
  t,
}: {
  millId: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const rows = await getSupplierScorecard(millId);
  return (
    <div className="flex flex-col gap-4">
      {rows.length > 0 && (
        <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
          <SupplierChart data={rows} />
        </div>
      )}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4] text-sm text-[#4A5057]">
            <th className="px-2 py-1 font-normal">{t("supplier")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("consignments")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("cftSupplied")}</th>
            <th className="px-2 py-1 text-right font-normal">{t("avgRecovery")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="h-10 border-b border-[#C9CFD4]">
              <td className="px-2 text-[#14171A]">{r.name}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">{r.consignments}</td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {formatCft(r.cftSupplied)}
              </td>
              <td className="px-2 text-right tabular-nums text-[#14171A]">
                {r.avgRecoveryPct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-[#4A5057]">{t("supplierMinHint")}</p>}
    </div>
  );
}
