import { formatCft } from "@/lib/i18n/format";

/**
 * "250 – 278 CFT (52% – 58%)" — never a point estimate (architecture §5:
 * "Show a range, never a point"). num-lg per UI spec typography table.
 */
export function RangeDisplay({
  low,
  high,
  unit,
  secondary,
  size = "lg",
}: {
  low: number;
  high: number;
  unit?: string;
  secondary?: string;
  size?: "lg" | "md";
}) {
  const textSize = size === "lg" ? "text-[24px]" : "text-[17px]";
  return (
    <span className={`inline-flex items-baseline gap-2 ${textSize} font-semibold tabular-nums text-[#14171A]`}>
      <span>
        {formatCft(low)} – {formatCft(high)}
        {unit ? ` ${unit}` : ""}
      </span>
      {secondary && (
        <span className="text-sm font-normal text-[#4A5057]">
          ({secondary})
        </span>
      )}
    </span>
  );
}
