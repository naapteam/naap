/** "TK-2609-01" — species code, YYMM of arrival, 2-digit sequence within
 * that species+month for the mill. Sequence is derived from a count query
 * at write time (see app/api/intake/close/route.ts); this is the pure,
 * testable formatting half. */
export function yearMonthCode(date: Date): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export function buildLotCode(
  speciesCode: string,
  date: Date,
  sequence: number,
): string {
  const ym = yearMonthCode(date);
  const seq = String(sequence).padStart(2, "0");
  return `${speciesCode.toUpperCase()}-${ym}-${seq}`;
}

/** The `LIKE` prefix a sequence-counting query should match against. */
export function lotCodePrefix(speciesCode: string, date: Date): string {
  return `${speciesCode.toUpperCase()}-${yearMonthCode(date)}-`;
}
