import { describe, expect, it } from "vitest";
import {
  MM_PER_FOOT,
  MM_PER_INCH,
  cftToCbm,
  hoppusCft,
  logCftByConvention,
  roundForDisplay,
  roundForStorage,
  sawnCft,
  trueCft,
} from "../volume";

const inch = (n: number) => n * MM_PER_INCH;
const foot = (n: number) => n * MM_PER_FOOT;

describe("hoppusCft", () => {
  it("matches the UI spec's tally-grid worked example (36in girth, 12ft length -> 6.75 CFT)", () => {
    expect(hoppusCft(inch(36), foot(12))).toBeCloseTo(6.75, 4);
  });

  it("matches the second worked example (34in girth, 12ft length -> 6.02 CFT)", () => {
    expect(roundForDisplay(hoppusCft(inch(34), foot(12)))).toBeCloseTo(
      6.02,
      2,
    );
  });

  it("scales linearly with length", () => {
    const a = hoppusCft(inch(36), foot(12));
    const b = hoppusCft(inch(36), foot(24));
    expect(b).toBeCloseTo(a * 2, 6);
  });

  it("scales with the square of girth", () => {
    const a = hoppusCft(inch(20), foot(10));
    const b = hoppusCft(inch(40), foot(10));
    expect(b).toBeCloseTo(a * 4, 6);
  });

  it("is zero for zero length", () => {
    expect(hoppusCft(inch(36), 0)).toBe(0);
  });
});

describe("trueCft", () => {
  it("computes the geometric cylinder volume from girth", () => {
    // volume = pi * r^2 * l, r = circumference / (2*pi)
    const girthMm = inch(36);
    const lengthMm = foot(12);
    const radiusIn = 36 / (2 * Math.PI);
    const expected = (Math.PI * radiusIn ** 2 * 12) / 144;
    expect(trueCft(girthMm, lengthMm)).toBeCloseTo(expected, 6);
  });

  it("exceeds hoppus by the documented ~21% (architecture §4)", () => {
    const girthMm = inch(36);
    const lengthMm = foot(12);
    const hoppus = hoppusCft(girthMm, lengthMm);
    const trueVol = trueCft(girthMm, lengthMm);
    const underestimatePct = (1 - hoppus / trueVol) * 100;
    expect(underestimatePct).toBeGreaterThan(20);
    expect(underestimatePct).toBeLessThan(23);
  });

  it("never corrects hoppus toward true — the two stay independent", () => {
    const girthMm = inch(30);
    const lengthMm = foot(10);
    expect(trueCft(girthMm, lengthMm)).toBeGreaterThan(
      hoppusCft(girthMm, lengthMm),
    );
  });
});

describe("sawnCft", () => {
  it("computes standard-trade CFT for a common sawn size (2x4x12 -> ~0.667 CFT)", () => {
    expect(sawnCft(inch(2), inch(4), foot(12))).toBeCloseTo(0.6667, 3);
  });

  it("multiplies by quantity", () => {
    const one = sawnCft(inch(2), inch(4), foot(12), 1);
    const ten = sawnCft(inch(2), inch(4), foot(12), 10);
    expect(ten).toBeCloseTo(one * 10, 6);
  });

  it("matches the order of magnitude implied by the UI spec's cut-plan example", () => {
    // 480 CFT in, predicted 250-278 CFT out, split across 2x4x12 (140-156 pcs)
    // and 1x6x10 (88-98 pcs). A single size's piece count times its per-piece
    // CFT should land within the overall output band, not an order of
    // magnitude off it.
    const perPiece2x4x12 = sawnCft(inch(2), inch(4), foot(12));
    const volumeFor150Pieces = perPiece2x4x12 * 150;
    expect(volumeFor150Pieces).toBeGreaterThan(50);
    expect(volumeFor150Pieces).toBeLessThan(150);
  });
});

describe("cftToCbm", () => {
  it("converts using the fixed factor", () => {
    expect(cftToCbm(1)).toBeCloseTo(0.0283168, 7);
    expect(cftToCbm(100)).toBeCloseTo(2.83168, 5);
  });
});

describe("logCftByConvention", () => {
  const girthMm = inch(36);
  const lengthMm = foot(12);

  it("dispatches to hoppus by default", () => {
    expect(logCftByConvention("hoppus", girthMm, lengthMm)).toBeCloseTo(
      hoppusCft(girthMm, lengthMm),
      6,
    );
  });

  it("dispatches to true volume", () => {
    expect(logCftByConvention("true", girthMm, lengthMm)).toBeCloseTo(
      trueCft(girthMm, lengthMm),
      6,
    );
  });

  it("dispatches to cbm (converted from hoppus)", () => {
    expect(logCftByConvention("cbm", girthMm, lengthMm)).toBeCloseTo(
      cftToCbm(hoppusCft(girthMm, lengthMm)),
      6,
    );
  });
});

describe("rounding rules (architecture §4: 4dp storage, 2dp display)", () => {
  it("rounds to 4 decimals for storage", () => {
    expect(roundForStorage(6.123456)).toBe(6.1235);
  });

  it("rounds to 2 decimals for display", () => {
    expect(roundForDisplay(6.123456)).toBe(6.12);
  });
});
