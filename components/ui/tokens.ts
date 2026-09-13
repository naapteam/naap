// The six fixed marking colours — UI spec §2. Meaning never changes
// anywhere in the product; these are solid chips, not tints.
export type MarkTone = "intake" | "wip" | "ready" | "idle" | "waste" | "alert";

export const MARK_COLOR: Record<MarkTone, string> = {
  intake: "var(--mark-intake)",
  wip: "var(--mark-wip)",
  ready: "var(--mark-ready)",
  idle: "var(--mark-idle)",
  waste: "var(--mark-waste)",
  alert: "var(--mark-alert)",
};
