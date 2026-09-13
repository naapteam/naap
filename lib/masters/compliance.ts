/** Countdown pill tone — UI spec §6.8a: green -> ochre at 60 days -> red
 * at 7 days. Returns null when there's no expiry to track. */
export function complianceTone(
  expiresOn: Date | null,
  now: Date = new Date(),
): "ready" | "wip" | "alert" | null {
  if (!expiresOn) return null;
  const days = Math.ceil((expiresOn.getTime() - now.getTime()) / 86_400_000);
  if (days <= 7) return "alert";
  if (days <= 60) return "wip";
  return "ready";
}

export function daysUntil(expiresOn: Date, now: Date = new Date()): number {
  return Math.ceil((expiresOn.getTime() - now.getTime()) / 86_400_000);
}
