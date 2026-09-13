import { sawnCft } from "@/lib/volume";

export type TargetInput = {
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  targetQuantity?: number;
};

/**
 * Splits a lot-level predicted output volume (architecture §5's predict()
 * only returns one aggregate range) across target sizes, proportional to
 * each size's requested volume share, into a single predicted piece count
 * per row — matching conversion_target.predicted_quantity, which is one
 * column, not a low/high pair. This allocation is a UI-layer derivation,
 * not part of the specified prediction algorithm.
 */
export function allocateTargetQuantities(
  targets: TargetInput[],
  totalOutputCft: number,
): number[] {
  if (targets.length === 0) return [];
  const perPieceCfts = targets.map((t) => sawnCft(t.thicknessMm, t.widthMm, t.lengthMm));
  const weights = targets.map((t, i) => perPieceCfts[i] * (t.targetQuantity ?? 1));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  return targets.map((_, i) => {
    const share = totalWeight > 0 ? weights[i] / totalWeight : 1 / targets.length;
    const perPieceCft = perPieceCfts[i];
    const volume = totalOutputCft * share;
    return perPieceCft > 0 ? Math.round(volume / perPieceCft) : 0;
  });
}
