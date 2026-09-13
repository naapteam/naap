/**
 * 10px solid colour circle before the species name, everywhere — UI spec
 * §2. Colour comes from species.colour_hex (set in Masters), not a fixed
 * token, since species colours are per-mill configurable.
 */
export function SpeciesChip({
  name,
  colorHex,
}: {
  name: string;
  colorHex: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[#14171A]">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: colorHex }}
      />
      {name}
    </span>
  );
}
