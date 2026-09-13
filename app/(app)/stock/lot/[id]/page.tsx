import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { conversion, intake, lot, party, piece, species } from "@/lib/db/schema";
import { formatCft, formatDate, formatDateTime } from "@/lib/i18n/format";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { StatusPill } from "@/components/ui/StatusPill";
import type { MarkTone } from "@/components/ui/tokens";

const PIECE_STATUS_TONE: Record<string, MarkTone> = {
  free: "idle",
  reserved: "wip",
  consumed: "waste",
  dispatched: "ready",
  cancelled: "waste",
};

const CONVERSION_STATUS_TONE: Record<string, MarkTone> = {
  planned: "wip",
  confirmed: "ready",
  cancelled: "waste",
};

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const t = await getTranslations("stock.lotDetail");
  const tStock = await getTranslations("stock");
  const tConversion = await getTranslations("conversion");
  if (!session?.millId) return null;

  const lotRow = await db.query.lot.findFirst({
    where: eq(lot.id, id),
  });
  if (!lotRow || lotRow.millId !== session.millId) notFound();

  const [speciesRow, intakeRow, conversions, pieces] = await Promise.all([
    db.query.species.findFirst({ where: eq(species.id, lotRow.speciesId) }),
    lotRow.intakeId
      ? db.query.intake.findFirst({ where: eq(intake.id, lotRow.intakeId) })
      : Promise.resolve(undefined),
    db.select().from(conversion).where(eq(conversion.lotId, lotRow.id)),
    db.select().from(piece).where(eq(piece.lotId, lotRow.id)),
  ]);

  const supplier = intakeRow?.supplierId
    ? await db.query.party.findFirst({ where: eq(party.id, intakeRow.supplierId) })
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-[#14171A]">
          {t("title", { code: lotRow.code })}
        </h1>
        <Link href="/stock" className="text-sm text-[#1B6BB8]">
          {t("back")}
        </Link>
      </div>

      {speciesRow && (
        <SpeciesChip name={speciesRow.nameEn} colorHex={speciesRow.colourHex} />
      )}

      {intakeRow && (
        <section className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-[#4A5057]">{t("intakeHeader")}</h2>
          <dl className="grid grid-cols-2 gap-2 text-[17px] text-[#14171A] sm:grid-cols-4">
            <Row label={t("supplier")} value={supplier?.name ?? "—"} />
            <Row label={t("vehicle")} value={intakeRow.vehicleNo ?? "—"} />
            <Row label={t("arrivedAt")} value={formatDateTime(intakeRow.arrivedAt)} />
            <Row
              label={t("defects")}
              value={intakeRow.defects.length > 0 ? intakeRow.defects.join(", ") : t("noDefects")}
            />
          </dl>
        </section>
      )}

      <section className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-[#4A5057]">{t("conversions")}</h2>
        {conversions.length === 0 ? (
          <p className="text-[#4A5057]">{t("noConversions")}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <tbody>
              {conversions.map((c) => (
                <tr key={c.id} className="h-10 border-b border-[#C9CFD4]">
                  <td className="text-sm tabular-nums text-[#4A5057]">
                    {formatDate(c.occurredAt)}
                  </td>
                  <td>
                    {c.inputCft && c.outputCft
                      ? `${formatCft(Number(c.inputCft))} → ${formatCft(Number(c.outputCft))} CFT`
                      : "—"}
                  </td>
                  <td>
                    <StatusPill
                      tone={CONVERSION_STATUS_TONE[c.status] ?? "wip"}
                      label={tConversion(`status.${c.status}`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-[#4A5057]">{t("pieces")}</h2>
        {pieces.length === 0 ? (
          <p className="text-[#4A5057]">{t("noPieces")}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <tbody>
              {pieces.map((p) => (
                <tr key={p.id} className="h-10 border-b border-[#C9CFD4]">
                  <td className="text-[17px] text-[#14171A]">{tStock(`form.${p.form}`)}</td>
                  <td className="text-right tabular-nums text-[#14171A]">
                    {formatCft(Number(p.volumeCft))} CFT
                  </td>
                  <td>
                    <StatusPill
                      tone={PIECE_STATUS_TONE[p.status] ?? "idle"}
                      label={tStock(`status.${p.status}`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-[#4A5057]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
