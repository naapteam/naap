import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function Home() {
  const session = await getSession();
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <LanguageSwitcher />
      <p className="text-[#4A5057]">{t("buildInProgress")}</p>
      {session && (
        <div className="flex flex-col items-center gap-2 text-sm text-[#14171A]">
          <p>{t("signedInAs", { name: session.name, role: session.role })}</p>
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold"
            >
              {tCommon("actions.signOut")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
