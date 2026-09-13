import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { complianceDoc, species } from "@/lib/db/schema";
import { SpeciesTab } from "@/components/masters/SpeciesTab";
import { ComplianceTab } from "@/components/masters/ComplianceTab";
import { RateLockTab } from "@/components/masters/RateLockTab";

const SUB_TABS = [
  "species",
  "grades",
  "bays",
  "sizePresets",
  "parties",
  "users",
  "thresholds",
  "millProfile",
  "dataExport",
  "rateLock",
  "compliance",
] as const;
type SubTab = (typeof SUB_TABS)[number];

export default async function MastersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "owner") redirect("/");
  const t = await getTranslations("masters");

  const sp = await searchParams;
  const tab: SubTab = (SUB_TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as SubTab)
    : "species";

  return (
    <div className="flex gap-6">
      <nav className="flex w-48 shrink-0 flex-col gap-1">
        {SUB_TABS.map((tk) => (
          <Link
            key={tk}
            href={`/masters?tab=${tk}`}
            className={`rounded-md px-3 py-2 text-[17px] ${
              tab === tk ? "bg-[#F2F4F5] font-semibold text-[#14171A]" : "text-[#4A5057]"
            }`}
          >
            {t(`tabs.${tk}`)}
          </Link>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "species" && <SpeciesTabLoader millId={session.millId!} />}
        {tab === "compliance" && <ComplianceTabLoader millId={session.millId!} />}
        {tab === "rateLock" && <RateLockTab />}
        {tab !== "species" && tab !== "compliance" && tab !== "rateLock" && (
          <p className="text-[#4A5057]">{t(`placeholder.${tab}`)}</p>
        )}
      </div>
    </div>
  );
}

async function SpeciesTabLoader({ millId }: { millId: string }) {
  const rows = await db
    .select()
    .from(species)
    .where(eq(species.millId, millId))
    .orderBy(asc(species.sortOrder));
  return <SpeciesTab rows={rows} />;
}

async function ComplianceTabLoader({ millId }: { millId: string }) {
  const rows = await db
    .select()
    .from(complianceDoc)
    .where(eq(complianceDoc.millId, millId))
    .orderBy(asc(complianceDoc.expiresOn));
  return <ComplianceTab rows={rows} />;
}
