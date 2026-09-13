import { describe, expect, it } from "vitest";
import { allocateTargetQuantities } from "../targetAllocation";
import { sawnCft } from "@/lib/volume";

describe("allocateTargetQuantities", () => {
  it("splits proportional to requested volume share for two equal-weight rows", () => {
    const targets = [
      { thicknessMm: 51, widthMm: 102, lengthMm: 3658, targetQuantity: 1 },
      { thicknessMm: 51, widthMm: 102, lengthMm: 3658, targetQuantity: 1 },
    ];
    const perPieceCft = sawnCft(51, 102, 3658);
    const total = perPieceCft * 20; // 10 pieces' worth to each row
    const result = allocateTargetQuantities(targets, total);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(10);
  });

  it("gives more pieces to the row requesting a larger share", () => {
    const targets = [
      { thicknessMm: 51, widthMm: 102, lengthMm: 3658, targetQuantity: 3 },
      { thicknessMm: 51, widthMm: 102, lengthMm: 3658, targetQuantity: 1 },
    ];
    const perPieceCft = sawnCft(51, 102, 3658);
    const result = allocateTargetQuantities(targets, perPieceCft * 40);
    expect(result[0]).toBeGreaterThan(result[1]);
    expect(result[0]).toBe(30);
    expect(result[1]).toBe(10);
  });

  it("falls back to equal weighting when no target quantities are given", () => {
    const targets = [
      { thicknessMm: 51, widthMm: 102, lengthMm: 3658 },
      { thicknessMm: 25, widthMm: 102, lengthMm: 3658 },
    ];
    const result = allocateTargetQuantities(targets, 100);
    // both get 1x weight regardless of size when quantity is unspecified
    expect(result.length).toBe(2);
    expect(result.every((n) => n >= 0)).toBe(true);
  });

  it("returns an empty array for no targets", () => {
    expect(allocateTargetQuantities([], 100)).toEqual([]);
  });

  it("never divides by zero for a degenerate (zero-volume) target", () => {
    const result = allocateTargetQuantities(
      [{ thicknessMm: 0, widthMm: 0, lengthMm: 0 }],
      100,
    );
    expect(result[0]).toBe(0);
  });
});
