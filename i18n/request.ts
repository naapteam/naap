import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { defaultLocale, isAppLocale } from "./locales";

// Locale is per-user, not per-URL (UI spec §5: "Language per user, not per
// device"), so there's no [locale] route segment — this resolves the
// active locale from the signed-in user's saved preference, falling back
// to a plain cookie for the logged-out login screen.
export const LOCALE_COOKIE = "naap_locale";

export default getRequestConfig(async () => {
  const session = await getSession();
  let locale = defaultLocale;

  if (session && isAppLocale(session.locale)) {
    locale = session.locale;
  } else {
    const store = await cookies();
    const cookieLocale = store.get(LOCALE_COOKIE)?.value;
    if (isAppLocale(cookieLocale)) locale = cookieLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
