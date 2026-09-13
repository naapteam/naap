"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/lib/i18n/actions";
import { locales, localeLabels, type AppLocale } from "@/i18n/locales";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <form action={setLocaleAction} className="flex items-center gap-1">
      <input type="hidden" name="pathname" value={pathname} />
      <label htmlFor="locale-select" className="sr-only">
        {t("language")}
      </label>
      <select
        id="locale-select"
        name="locale"
        defaultValue={locale}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border-[1.5px] border-[#C9CFD4] bg-white px-2 text-sm text-[#14171A]"
      >
        {locales.map((code: AppLocale) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </form>
  );
}
