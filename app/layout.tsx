import type { Metadata } from "next";
import { Hind_Vadodara, Mukta } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Devanagari + Latin (hi/mr/en) — see globals.css for why Gujarati needs a
// separate family.
const mukta = Mukta({
  weight: ["400", "600"],
  subsets: ["latin", "devanagari"],
  variable: "--font-mukta",
  display: "swap",
});

// Gujarati counterpart — Mukta ships no Gujarati glyphs at all.
const muktaGujarati = Hind_Vadodara({
  weight: ["400", "600"],
  subsets: ["latin", "gujarati"],
  variable: "--font-mukta-gu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Naap",
  description: "Timber-mill operations — intake, cut planning, stock, despatch, reports.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${mukta.variable} ${muktaGujarati.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
