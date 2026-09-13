import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { intake, lot, party, species } from "@/lib/db/schema";
import { IntakeListTable, type IntakeRow } from "@/components/intake/IntakeListTable";

export default async function IntakePage() {
  const session = await getSession();
  const t = await getTranslations("intake");
  if (!session?.millId) return null;

  const rows: IntakeRow[] = await db
    .select({
      id: intake.id,
      arrivedAt: intake.arrivedAt,
      vehicleNo: intake.vehicleNo,
      talliedPieces: intake.talliedPieces,
      talliedCft: intake.talliedCft,
      declaredCft: intake.declaredCft,
      status: intake.status,
      supplierName: party.name,
      speciesNameEn: species.nameEn,
      speciesColour: species.colourHex,
      lotCode: lot.code,
    })
    .from(intake)
    .leftJoin(party, eq(party.id, intake.supplierId))
    .leftJoin(lot, eq(lot.intakeId, intake.id))
    .leftJoin(species, eq(species.id, lot.speciesId))
    .where(eq(intake.millId, session.millId))
    .orderBy(desc(intake.arrivedAt))
    .limit(200);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>
        <Link
          href="/intake/new"
          className="h-10 rounded-md bg-[#1B6BB8] px-4 text-[17px] font-semibold leading-10 text-white"
        >
          {t("newIntake")}
        </Link>
      </div>

      <IntakeListTable rows={rows} />
    </div>
  );
}
