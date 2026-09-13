import { describe, expect, it } from "vitest";
import { type DefectCode, type PredictInput, predict } from "../predict";

const baseSpecies = { recoveryLow: 52, recoveryHigh: 62, byproductPct: 16 };

function makeInput(overrides: Partial<PredictInput> = {}): PredictInput {
  return {
    inputCft: 480,
    species: baseSpecies,
    avgGirthMm: 500 * Math.PI, // dia = 500mm -> no diaBonus, no size penalty band edge
    defects: [],
    targets: [],
    ...overrides,
  };
}

describe("predict — diameter bonus (architecture §5)", () => {
  it("gives +3 for large logs (dia >= 600mm)", () => {
    const r = predict(makeInput({ avgGirthMm: 650 * Math.PI }));
    expect(r.basis.diaBonus).toBe(3);
    expect(r.recoveryLow).toBe(baseSpecies.recoveryLow + 3);
  });

  it("gives 0 for mid logs (400mm <= dia < 600mm)", () => {
    const r = predict(makeInput({ avgGirthMm: 500 * Math.PI }));
    expect(r.basis.diaBonus).toBe(0);
    expect(r.recoveryLow).toBe(baseSpecies.recoveryLow);
  });

  it("gives -4 for small logs (dia < 400mm)", () => {
    const r = predict(makeInput({ avgGirthMm: 300 * Math.PI }));
    expect(r.basis.diaBonus).toBe(-4);
    expect(r.recoveryLow).toBe(baseSpecies.recoveryLow - 4);
  });
});

describe("predict — size penalty", () => {
  const dia500 = 500 * Math.PI;

  it("is 0 with no targets picked yet", () => {
    const r = predict(makeInput({ avgGirthMm: dia500, targets: [] }));
    expect(r.basis.sizePenalty).toBe(0);
  });

  it("is 0 when the largest target dimension is <= 40% of diameter", () => {
    const r = predict(
      makeInput({
        avgGirthMm: dia500,
        targets: [{ thicknessMm: 100, widthMm: 150, lengthMm: 3000 }],
      }),
    );
    expect(r.basis.sizePenalty).toBe(0);
  });

  it("is 2 when the largest target dimension is between 40% and 55% of diameter", () => {
    const r = predict(
      makeInput({
        avgGirthMm: dia500,
        targets: [{ thicknessMm: 100, widthMm: 250, lengthMm: 3000 }],
      }),
    );
    expect(r.basis.sizePenalty).toBe(2);
  });

  it("is 5 when the largest target dimension exceeds 55% of diameter", () => {
    const r = predict(
      makeInput({
        avgGirthMm: dia500,
        targets: [{ thicknessMm: 100, widthMm: 300, lengthMm: 3000 }],
      }),
    );
    expect(r.basis.sizePenalty).toBe(5);
  });

  it("bumps the offcut share up when a size penalty applies", () => {
    const noPenalty = predict(
      makeInput({
        avgGirthMm: dia500,
        targets: [{ thicknessMm: 50, widthMm: 50, lengthMm: 3000 }],
      }),
    );
    const withPenalty = predict(
      makeInput({
        avgGirthMm: dia500,
        targets: [{ thicknessMm: 100, widthMm: 300, lengthMm: 3000 }],
      }),
    );
    expect(noPenalty.offcut).toBeCloseTo(480 * 0.05, 6);
    expect(withPenalty.offcut).toBeCloseTo(480 * 0.08, 6);
  });
});

describe("predict — defect deductions", () => {
  it("applies the full deduction to the low end and 60% to the high end", () => {
    const defects: DefectCode[] = ["sweep", "borer"]; // 4.5 + 5.0 = 9.5
    const r = predict(makeInput({ defects }));
    expect(r.basis.deduction).toBeCloseTo(9.5, 6);
    expect(r.recoveryLow).toBeCloseTo(baseSpecies.recoveryLow - 9.5, 6);
    expect(r.recoveryHigh).toBeCloseTo(
      baseSpecies.recoveryHigh - 9.5 * 0.6,
      6,
    );
  });

  it("records a per-defect breakdown for the why-panel", () => {
    const defects: DefectCode[] = ["hollow", "stain"];
    const r = predict(makeInput({ defects }));
    expect(r.basis.defectBreakdown).toEqual([
      { code: "hollow", deduction: 7.0 },
      { code: "stain", deduction: 0.5 },
    ]);
  });

  it("uses the exact deduction table from architecture §5", () => {
    const table: Record<DefectCode, number> = {
      end_checks: 2.0,
      sweep: 4.5,
      taper: 2.5,
      borer: 5.0,
      hollow: 7.0,
      stain: 0.5,
    };
    for (const [code, expected] of Object.entries(table) as [
      DefectCode,
      number,
    ][]) {
      const r = predict(makeInput({ defects: [code] }));
      expect(r.basis.deduction).toBeCloseTo(expected, 6);
    }
  });
});

describe("predict — floor and range guarantees", () => {
  it("never lets the low end drop below 20%", () => {
    const r = predict(
      makeInput({
        species: { recoveryLow: 25, recoveryHigh: 30, byproductPct: 20 },
        avgGirthMm: 300 * Math.PI, // -4
        defects: ["hollow", "borer", "sweep", "taper", "end_checks", "stain"], // 21.5
      }),
    );
    expect(r.recoveryLow).toBe(20);
  });

  it("always keeps the high end at least 3 points above the low end", () => {
    const r = predict(
      makeInput({
        species: { recoveryLow: 25, recoveryHigh: 26, byproductPct: 20 },
        avgGirthMm: 300 * Math.PI,
        defects: ["hollow", "borer"],
      }),
    );
    expect(r.recoveryHigh).toBeGreaterThanOrEqual(r.recoveryLow + 3);
  });

  it("always returns a range, never collapses to a point (spec: show a range, never a point)", () => {
    const r = predict(makeInput());
    expect(r.outputHigh).toBeGreaterThan(r.outputLow);
    expect(r.recoveryHigh).toBeGreaterThan(r.recoveryLow);
  });
});

describe("predict — output composition", () => {
  it("derives byproduct from the species byproduct percentage", () => {
    const r = predict(makeInput({ inputCft: 500 }));
    expect(r.byproduct).toBeCloseTo(500 * (baseSpecies.byproductPct / 100), 6);
  });

  it("derives output low/high directly from the recovery band", () => {
    const r = predict(makeInput({ inputCft: 500 }));
    expect(r.outputLow).toBeCloseTo(500 * (r.recoveryLow / 100), 6);
    expect(r.outputHigh).toBeCloseTo(500 * (r.recoveryHigh / 100), 6);
  });

  it("never lets waste go negative", () => {
    const r = predict(
      makeInput({
        species: { recoveryLow: 90, recoveryHigh: 95, byproductPct: 30 },
        inputCft: 100,
      }),
    );
    expect(r.waste).toBeGreaterThanOrEqual(0);
  });

  it("matches the architecture §5 seed bands at neutral diameter/size/defects", () => {
    const seeds: [string, { recoveryLow: number; recoveryHigh: number }][] = [
      ["Teak", { recoveryLow: 52, recoveryHigh: 62 }],
      ["Sal", { recoveryLow: 50, recoveryHigh: 58 }],
      ["Babul", { recoveryLow: 42, recoveryHigh: 52 }],
      ["Neem", { recoveryLow: 45, recoveryHigh: 55 }],
      ["Mango", { recoveryLow: 45, recoveryHigh: 55 }],
      ["Eucalyptus", { recoveryLow: 40, recoveryHigh: 50 }],
      ["Imported hardwood", { recoveryLow: 50, recoveryHigh: 60 }],
    ];
    for (const [, band] of seeds) {
      const r = predict(
        makeInput({
          species: { ...band, byproductPct: 18 },
          avgGirthMm: 500 * Math.PI, // 0 bonus
          targets: [],
          defects: [],
        }),
      );
      expect(r.recoveryLow).toBe(band.recoveryLow);
      expect(r.recoveryHigh).toBe(band.recoveryHigh);
    }
  });
});

describe("predict — explainability", () => {
  it("stores the species band on the basis for the why-panel", () => {
    const r = predict(makeInput());
    expect(r.basis.speciesLow).toBe(baseSpecies.recoveryLow);
    expect(r.basis.speciesHigh).toBe(baseSpecies.recoveryHigh);
  });

  it("carries the original defect list through to the basis", () => {
    const defects: DefectCode[] = ["taper", "stain"];
    const r = predict(makeInput({ defects }));
    expect(r.basis.defects).toEqual(defects);
  });
});
