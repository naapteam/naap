import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { formatCft } from "@/lib/i18n/format";
import { daysUntil } from "@/lib/masters/compliance";
import { MetricTile } from "@/components/ui/MetricTile";
import {
  getAutoAcceptRates,
  getComplianceAlerts,
  getDashboardMetrics,
  getPendingConfirmationsCount,
  getPredictionAccuracy,
} from "@/lib/reports/dashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.millId) return null;
  const millId = session.millId;
  const t = await getTranslations("dashboard");
  const complianceT = await getTranslations("masters.compliance");

  const [metrics, pendingCount, accuracy, autoAccept, complianceAlerts] = await Promise.all([
    getDashboardMetrics(millId),
    getPendingConfirmationsCount(millId),
    getPredictionAccuracy(millId),
    getAutoAcceptRates(millId),
    getComplianceAlerts(millId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricTile
          label={t("intake")}
          value={`${formatCft(metrics.intakeTodayCft)} CFT`}
          caption={t("today")}
        />
        <MetricTile
          label={t("output")}
          value={`${formatCft(metrics.outputTodayCft)} CFT`}
          caption={t("today")}
        />
        <MetricTile
          label={t("recovery")}
          value={`${metrics.recoveryMonthPct.toFixed(1)}%`}
          caption={t("thisMonth")}
        />
        <MetricTile
          label={t("deadStock")}
          value={`${formatCft(metrics.deadStockOver60Cft)} CFT`}
          caption={t("over60Days")}
        />
      </div>

      {metrics.unexplainedMonthCft > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border-[1.5px] border-[#D6534A] bg-[#FBEAE8] px-4 py-3">
          <span className="text-[#8A2A22]">
            {t("unexplainedBanner", { cft: formatCft(metrics.unexplainedMonthCft) })}
          </span>
          <Link
            href="/reports?tab=reconciliation"
            className="font-semibold text-[#8A2A22] underline"
          >
            {t("lookIntoIt")}
          </Link>
        </div>
      )}

      {complianceAlerts.length > 0 && (
        <div className="flex flex-col gap-1">
          {complianceAlerts.map((a) => {
            const days = daysUntil(a.expiresOn);
            return (
              <p
                key={a.id}
                className={a.tone === "alert" ? "text-[#C03028]" : "text-[#4A5057]"}
              >
                {a.label} — {days < 0 ? complianceT("expired") : complianceT("daysLeft", { days })}
              </p>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#4A5057]">{t("pendingConfirmations")}</h2>
          <p className="mt-1 text-[17px] text-[#14171A]">
            {t("cutsAwaiting", { count: pendingCount })}
          </p>
          <Link href="/cut-plan" className="mt-2 inline-block text-[#1B6BB8]">
            {t("open")}
          </Link>
        </div>
        <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#4A5057]">{t("predictionAccuracy")}</h2>
          <p className="mt-1 text-[17px] text-[#14171A]">
            {accuracy.total > 0
              ? t("last30Cuts", {
                  inside: accuracy.insideRange,
                  outside: accuracy.outsideRange,
                })
              : t("noCutsYet")}
          </p>
        </div>
      </div>

      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#4A5057]">{t("autoAcceptTitle")}</h2>
        <p className="text-xs text-[#4A5057]">{t("autoAcceptHint")}</p>
        {autoAccept.length === 0 ? (
          <p className="mt-2 text-[#4A5057]">{t("noConfirmations")}</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left">
            <tbody>
              {autoAccept.map((row) => (
                <tr key={row.userId} className="h-9 border-b border-[#C9CFD4]">
                  <td className="text-[17px] text-[#14171A]">{row.userName}</td>
                  <td className="text-right text-[17px] tabular-nums text-[#14171A]">
                    {row.ratePct.toFixed(0)}%
                  </td>
                  <td className="text-right text-sm tabular-nums text-[#4A5057]">
                    {row.autoAccepted}/{row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
