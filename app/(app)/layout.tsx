import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { mill, org } from "@/lib/db/schema";
import { formatDate } from "@/lib/i18n/format";
import { AppShell } from "@/components/AppShell";
import type { Role } from "@/lib/auth/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Mill switcher (UI spec §5) only ever renders for an org-level user
  // (millId IS NULL) — out of scope until a second mill exists. Until then
  // an org-level user just sees their org's name in the header slot.
  const millName = session.millId
    ? (await db.query.mill.findFirst({ where: eq(mill.id, session.millId) }))
        ?.name
    : (await db.query.org.findFirst({ where: eq(org.id, session.orgId) }))
        ?.name;

  return (
    <AppShell
      user={{ name: session.name, role: session.role as Role }}
      millName={millName ?? "Naap"}
      dateLabel={formatDate(new Date())}
    >
      {children}
    </AppShell>
  );
}
