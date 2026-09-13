"use client";

import { useTranslations } from "next-intl";

export type SyncStatus = "saved" | "sending" | "offline";

/**
 * Three states, icon plus word, never colour alone — UI spec §5. Wired to
 * a static "saved" state until the offline outbox (architecture §9) lands
 * and can report real queue depth.
 */
export function SyncBadge({
  status,
  waitingCount = 0,
  onClick,
}: {
  status: SyncStatus;
  waitingCount?: number;
  onClick?: () => void;
}) {
  const t = useTranslations("common.sync");
  const tone =
    status === "saved" ? "#1F7A4D" : status === "sending" ? "#B5730E" : "#5F6B73";
  const icon = status === "saved" ? "✓" : status === "sending" ? "…" : "⏸";
  const label =
    status === "offline" ? t("offline", { count: waitingCount }) : t(status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#C9CFD4] bg-white px-2.5 py-1 text-sm text-[#14171A]"
    >
      <span aria-hidden style={{ color: tone }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
