// UI spec §4: Latin digits in all four languages, Indian digit grouping for
// currency (₹12,45,600), dates DD-MM-YYYY. These rules are fixed regardless
// of the active UI language — never derive number/date formatting from the
// next-intl locale.

const GROUPING_LOCALE = "en-IN";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(GROUPING_LOCALE, options).format(value);
}

/** CFT figures etc. — 2 decimals for display per architecture §4. */
export function formatCft(value: number): string {
  return formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** ₹12,45,600 — whole rupees, Indian grouping, no decimals. */
export function formatInr(value: number): string {
  return new Intl.NumberFormat(GROUPING_LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** DD-MM-YYYY, always — never locale-dependent date ordering. */
export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
