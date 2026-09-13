import { and, asc, eq, or } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { location, party, species } from "@/lib/db/schema";
import { IntakeWizard } from "@/components/intake/IntakeWizard";

export default async function NewIntakePage() {
  const session = await getSession();
  if (!session?.millId) return null;
  const millId = session.millId;

  const [suppliers, speciesList, bays] = await Promise.all([
    db
      .select({ id: party.id, name: party.name })
      .from(party)
      .where(
        and(eq(party.millId, millId), or(eq(party.kind, "supplier"), eq(party.kind, "both"))),
      ),
    db
      .select({ id: species.id, nameEn: species.nameEn, colourHex: species.colourHex })
      .from(species)
      .where(eq(species.millId, millId))
      .orderBy(asc(species.sortOrder)),
    db
      .select({ id: location.id, code: location.code })
      .from(location)
      .where(and(eq(location.millId, millId), eq(location.kind, "yard"))),
  ]);

  return <IntakeWizard suppliers={suppliers} speciesList={speciesList} bays={bays} />;
}
