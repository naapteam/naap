"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { appUser } from "@/lib/db/schema";
import { getSession, createSession } from "@/lib/auth/session";
import { isAppLocale } from "@/i18n/locales";
import { LOCALE_COOKIE } from "@/i18n/request";

// Language switcher (UI spec §5: "always visible" in the header). Locale is
// a per-user preference stored on app_user.locale, not a URL segment — for
// a signed-in user this persists it and re-signs the session cookie; for
// the logged-out login screen it just sets a cookie.
export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (!isAppLocale(locale)) return;
  const pathname = String(formData.get("pathname") ?? "/") || "/";

  const session = await getSession();
  if (session) {
    await db
      .update(appUser)
      .set({ locale })
      .where(eq(appUser.id, session.userId));
    await createSession({ ...session, locale });
  } else {
    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect(pathname);
}
