// Deterministic prediction engine. No ML — see architecture doc §5.
// Must always be explainable: `basis` carries every factor that moved the
// range, because the first time the number looks wrong, the munshi will
// ask how it was calculated, and there has to be an answer on screen.

export type DefectCode =
  | "end_checks"
  | "sweep"
  | "taper"
  | "borer"
  | "hollow"
  | "stain";

export type PredictTarget = {
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
};

export type PredictInput = {
  inputCft: number;
  species: {
    recoveryLow: number;
    recoveryHigh: number;
    byproductPct: number;
  };
  avgGirthMm: number;
  defects: DefectCode[];
  targets: PredictTarget[];
};

export type PredictionBasis = {
  speciesLow: number;
  speciesHigh: number;
  diaBonus: number;
  sizePenalty: number;
  deduction: number;
  defects: DefectCode[];
  defectBreakdown: { code: DefectCode; deduction: number }[];
};

export type PredictResult = {
  outputLow: number;
  outputHigh: number;
  offcut: number;
  byproduct: number;
  waste: number;
  recoveryLow: number;
  recoveryHigh: number;
  basis: PredictionBasis;
};

const DEFECT_DEDUCTION: Record<DefectCode, number> = {
  end_checks: 2.0, // length loss both ends
  sweep: 4.5, // geometric, biggest single hit
  taper: 2.5, // hurts long sizes
  borer: 5.0, // internal, partly invisible
  hollow: 7.0, // pith rot
  stain: 0.5, // grade drop, little volume loss
};

export function predict(i: PredictInput): PredictResult {
  // 1. base band from species + diameter class
  const dia = i.avgGirthMm / Math.PI;
  const diaBonus = dia >= 600 ? 3 : dia >= 400 ? 0 : -4; // big logs saw better
  let low = i.species.recoveryLow + diaBonus;
  let high = i.species.recoveryHigh + diaBonus;

  // 2. size penalty — large targets from small logs waste more
  const maxDim =
    i.targets.length > 0
      ? Math.max(...i.targets.map((t) => Math.max(t.thicknessMm, t.widthMm)))
      : 0;
  const sizePenalty =
    i.targets.length > 0
      ? maxDim > dia * 0.55
        ? 5
        : maxDim > dia * 0.4
          ? 2
          : 0
      : 0;
  low -= sizePenalty;
  high -= sizePenalty;

  // 3. defect deduction
  const deduction = i.defects.reduce((s, d) => s + DEFECT_DEDUCTION[d], 0);
  low -= deduction;
  high -= deduction * 0.6; // upper bound less affected

  low = Math.max(low, 20);
  high = Math.max(high, low + 3);

  const byproduct = i.inputCft * (i.species.byproductPct / 100);
  const outputLow = i.inputCft * (low / 100);
  const outputHigh = i.inputCft * (high / 100);
  const offcut = i.inputCft * (sizePenalty > 0 ? 0.08 : 0.05);
  const waste = Math.max(0, i.inputCft - outputHigh - byproduct - offcut);

  return {
    outputLow,
    outputHigh,
    offcut,
    byproduct,
    waste,
    recoveryLow: low,
    recoveryHigh: high,
    basis: {
      speciesLow: i.species.recoveryLow,
      speciesHigh: i.species.recoveryHigh,
      diaBonus,
      sizePenalty,
      deduction,
      defects: i.defects,
      defectBreakdown: i.defects.map((code) => ({
        code,
        deduction: DEFECT_DEDUCTION[code],
      })),
    },
  };
}
