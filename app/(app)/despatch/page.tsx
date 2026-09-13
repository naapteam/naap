import { and, asc, eq, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { location, party, piece, species } from "@/lib/db/schema";
import { DespatchForm } from "@/components/despatch/DespatchForm";

export default async function DespatchPage() {
  const session = await getSession();
  if (!session?.millId) return null;
  const millId = session.millId;

  const [stockRows, customers] = await Promise.all([
    db
      .select({
        id: piece.id,
        form: piece.form,
        girthMm: piece.girthMm,
        lengthMm: piece.lengthMm,
        thicknessMm: piece.thicknessMm,
        widthMm: piece.widthMm,
        volumeCft: piece.volumeCft,
        speciesNameEn: species.nameEn,
        speciesColour: species.colourHex,
        bayCode: location.code,
      })
      .from(piece)
      .leftJoin(species, eq(species.id, piece.speciesId))
      .leftJoin(location, eq(location.id, piece.locationId))
      .where(and(eq(piece.millId, millId), eq(piece.status, "free")))
      .orderBy(asc(location.code)),
    db
      .select({ id: party.id, name: party.name })
      .from(party)
      .where(
        and(eq(party.millId, millId), or(eq(party.kind, "customer"), eq(party.kind, "both"))),
      ),
  ]);

  return (
    <DespatchForm
      stock={stockRows}
      customers={customers}
      isOwner={session.role === "owner"}
    />
  );
}
