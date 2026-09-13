import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { location, lot, piece, species } from "@/lib/db/schema";
import { ageInDays } from "@/lib/stock/format";
import { StockTable, type StockRow } from "@/components/stock/StockTable";

type Tab = "all" | "offcut" | "byproduct";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; form?: string; speciesId?: string; bayId?: string }>;
}) {
  const session = await getSession();
  const t = await getTranslations("stock");
  if (!session?.millId) return null;
  const millId = session.millId;

  const sp = await searchParams;
  const tab: Tab = sp.tab === "offcut" || sp.tab === "byproduct" ? sp.tab : "all";

  const [speciesList, bays] = await Promise.all([
    db
      .select({ id: species.id, nameEn: species.nameEn })
      .from(species)
      .where(eq(species.millId, millId))
      .orderBy(asc(species.sortOrder)),
    db
      .select({ id: location.id, code: location.code })
      .from(location)
      .where(eq(location.millId, millId)),
  ]);

  const conditions = [eq(piece.millId, millId)];
  if (tab === "offcut") {
    conditions.push(eq(piece.purpose, "offcut"), eq(piece.status, "free"));
  } else if (tab === "byproduct") {
    conditions.push(eq(piece.form, "byproduct"), eq(piece.status, "free"));
  } else {
    conditions.push(inArray(piece.status, ["free", "reserved"]));
    if (sp.form) conditions.push(eq(piece.form, sp.form));
  }
  if (sp.speciesId) conditions.push(eq(piece.speciesId, sp.speciesId));
  if (sp.bayId) conditions.push(eq(piece.locationId, sp.bayId));

  const rawRows = await db
    .select({
      id: piece.id,
      lotId: piece.lotId,
      lotCode: lot.code,
      form: piece.form,
      girthMm: piece.girthMm,
      lengthMm: piece.lengthMm,
      thicknessMm: piece.thicknessMm,
      widthMm: piece.widthMm,
      quantity: piece.quantity,
      uom: piece.uom,
      volumeCft: piece.volumeCft,
      status: piece.status,
      createdAt: piece.createdAt,
      speciesNameEn: species.nameEn,
      speciesColour: species.colourHex,
      bayCode: location.code,
    })
    .from(piece)
    .leftJoin(lot, eq(lot.id, piece.lotId))
    .leftJoin(species, eq(species.id, piece.speciesId))
    .leftJoin(location, eq(location.id, piece.locationId))
    .where(and(...conditions))
    .orderBy(tab === "offcut" ? asc(piece.createdAt) : desc(piece.createdAt))
    .limit(300);

  const rows: StockRow[] = rawRows.map((r) => ({
    ...r,
    ageDays: ageInDays(r.createdAt),
  }));

  const tabHref = (next: Tab) => `/stock${next === "all" ? "" : `?tab=${next}`}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>

      <div className="flex gap-1 border-b-[1.5px] border-[#C9CFD4]">
        {(["all", "offcut", "byproduct"] as Tab[]).map((tabKey) => (
          <Link
            key={tabKey}
            href={tabHref(tabKey)}
            className={`px-3 py-2 text-[17px] ${
              tab === tabKey
                ? "border-b-2 border-[#1B6BB8] font-semibold text-[#14171A]"
                : "text-[#4A5057]"
            }`}
          >
            {t(`tabs.${tabKey}`)}
          </Link>
        ))}
      </div>

      {tab === "all" && (
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="tab" value="all" />
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("filters.form")}
            <select
              name="form"
              defaultValue={sp.form ?? ""}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-[17px]"
            >
              <option value="">{t("filters.allForms")}</option>
              {["log", "cant", "sawn", "offcut", "byproduct"].map((f) => (
                <option key={f} value={f}>
                  {t(`form.${f}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("filters.species")}
            <select
              name="speciesId"
              defaultValue={sp.speciesId ?? ""}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-[17px]"
            >
              <option value="">{t("filters.allSpecies")}</option>
              {speciesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("filters.bay")}
            <select
              name="bayId"
              defaultValue={sp.bayId ?? ""}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-2 text-[17px]"
            >
              <option value="">{t("filters.allBays")}</option>
              {bays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
          >
            {t("filters.apply")}
          </button>
        </form>
      )}

      <StockTable rows={rows} mode={tab === "byproduct" ? "byproduct" : "sized"} />
    </div>
  );
}
