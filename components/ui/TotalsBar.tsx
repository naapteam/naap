/**
 * Pinned running totals under a grid — UI spec §3.8: "Running totals pinned.
 * Pieces and CFT fixed at the bottom of the grid, always visible."
 */
export function TotalsBar({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-end gap-6 border-t-[1.5px] border-[#C9CFD4] bg-white px-4 py-2">
      {items.map((item) => (
        <span key={item.label} className="text-sm text-[#4A5057]">
          {item.label}:{" "}
          <span className="text-[17px] font-semibold tabular-nums text-[#14171A]">
            {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}
