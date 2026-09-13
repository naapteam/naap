import type { MarkTone } from "./tokens";
import { MARK_COLOR } from "./tokens";

/**
 * Icon (colour dot) + word, never colour alone — same rule as the sync
 * badge (UI spec §5). Used for intake/piece/conversion/despatch status
 * columns.
 */
export function StatusPill({ tone, label }: { tone: MarkTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#C9CFD4] bg-white px-2 py-0.5 text-sm text-[#14171A]">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: MARK_COLOR[tone] }}
      />
      {label}
    </span>
  );
}
