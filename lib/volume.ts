// Single source of truth for volume mathematics. See architecture doc §4.
//
// Store all dimensions as integer millimetres. Convert only at the UI edge.
//
// `volume_convention` is stamped on a piece at creation and never
// recalculated — a mill buying on Hoppus and selling on true volume is
// normal, and the gap between the two is real margin that must stay
// visible, not be "corrected" away.

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;

export type VolumeConvention = "hoppus" | "true" | "cbm";

/** Hoppus / quarter-girth — the Indian round-log trade standard. */
export function hoppusCft(girthMm: number, lengthMm: number): number {
  const girthIn = girthMm / MM_PER_INCH;
  const lengthFt = lengthMm / MM_PER_FOOT;
  return ((girthIn / 4) ** 2 * lengthFt) / 144;
}

/** True geometric volume of a cylinder derived from girth. */
export function trueCft(girthMm: number, lengthMm: number): number {
  const girthIn = girthMm / MM_PER_INCH;
  const lengthFt = lengthMm / MM_PER_FOOT;
  const radiusIn = girthIn / (2 * Math.PI);
  return (Math.PI * radiusIn ** 2 * lengthFt) / 144;
}

/**
 * Sawn timber volume in CFT: (thickness_in × width_in × length_ft) / 144 —
 * the standard trade formula (144 = 12in × 12in, the cross-section of one
 * cubic foot at 1ft length).
 *
 * NOTE: architecture doc §4's code sample divides by 12, which computes
 * board-feet, not cubic feet (1 CFT = 12 board-feet). Divide by 12 twice —
 * once for board-feet, once more for CFT — hence /144. This was checked
 * against the UI spec §6.3 worked example (480 CFT input predicting
 * 140–156 pcs of 2×4×12 within a 250–278 CFT output range): /144 lands in
 * the right order of magnitude for that piece count, /12 is off by ~8×.
 */
export function sawnCft(
  tMm: number,
  wMm: number,
  lMm: number,
  qty = 1,
): number {
  const t = tMm / MM_PER_INCH;
  const w = wMm / MM_PER_INCH;
  const l = lMm / MM_PER_FOOT;
  return ((t * w * l) / 144) * qty;
}

export const cftToCbm = (cft: number): number => cft * 0.0283168;

/** Compute CFT for a log/cant by convention, dispatching to the right formula. */
export function logCftByConvention(
  convention: VolumeConvention,
  girthMm: number,
  lengthMm: number,
): number {
  if (convention === "true") return trueCft(girthMm, lengthMm);
  if (convention === "cbm") return cftToCbm(hoppusCft(girthMm, lengthMm));
  return hoppusCft(girthMm, lengthMm);
}

/** Round to 4 decimals for storage (architecture §4 rule). */
export const roundForStorage = (cft: number): number =>
  Math.round(cft * 10000) / 10000;

/** Round to 2 decimals for display (architecture §4 rule). */
export const roundForDisplay = (cft: number): number =>
  Math.round(cft * 100) / 100;
