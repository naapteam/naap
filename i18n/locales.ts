// No file here imports next/headers or the DB — this module is shared by
// the request config (server), the language switcher (client), and
// middleware (edge), so it has to stay dependency-free.
export const locales = ["en", "hi", "mr", "gu"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "hi";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  gu: "ગુજરાતી",
};
