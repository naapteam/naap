/** Dashboard metric tile — UI spec §6.1: num-xl, 36px/600/tabular. */
export function MetricTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-5">
      <span className="text-sm text-[#4A5057]">{label}</span>
      <span className="text-[36px] leading-tight font-semibold tabular-nums text-[#14171A]">
        {value}
      </span>
      {caption && <span className="text-sm text-[#4A5057]">{caption}</span>}
    </div>
  );
}
