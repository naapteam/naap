import { describe, expect, it } from "vitest";
import { ageBand, ageInDays, formatPieceSize } from "../format";

describe("formatPieceSize", () => {
  it("shows girth x length for logs", () => {
    expect(
      formatPieceSize({ form: "log", girthMm: 914, lengthMm: 3658, thicknessMm: null, widthMm: null }),
    ).toBe("36in × 12ft");
  });

  it("shows thickness x width x length for sawn pieces", () => {
    expect(
      formatPieceSize({ form: "sawn", girthMm: null, lengthMm: 3658, thicknessMm: 51, widthMm: 102 }),
    ).toBe("2×4×12ft");
  });

  it("shows thickness x width x length for offcuts too", () => {
    expect(
      formatPieceSize({ form: "offcut", girthMm: null, lengthMm: 1829, thicknessMm: 51, widthMm: 102 }),
    ).toBe("2×4×6ft");
  });

  it("returns an em-dash for byproduct (no dimensional size)", () => {
    expect(
      formatPieceSize({ form: "byproduct", girthMm: null, lengthMm: null, thicknessMm: null, widthMm: null }),
    ).toBe("—");
  });

  it("returns an em-dash when required dimensions are missing", () => {
    expect(
      formatPieceSize({ form: "log", girthMm: null, lengthMm: 3658, thicknessMm: null, widthMm: null }),
    ).toBe("—");
  });
});

describe("ageInDays", () => {
  it("computes whole days between two dates", () => {
    const created = new Date("2026-08-01T00:00:00Z");
    const now = new Date("2026-09-13T00:00:00Z");
    expect(ageInDays(created, now)).toBe(43);
  });

  it("never goes negative for a future createdAt (clock drift)", () => {
    const created = new Date("2026-09-20T00:00:00Z");
    const now = new Date("2026-09-13T00:00:00Z");
    expect(ageInDays(created, now)).toBe(0);
  });
});

describe("ageBand", () => {
  it("buckets into the four age bands from architecture §7", () => {
    expect(ageBand(0)).toBe("0-30");
    expect(ageBand(30)).toBe("0-30");
    expect(ageBand(31)).toBe("31-60");
    expect(ageBand(60)).toBe("31-60");
    expect(ageBand(61)).toBe("61-90");
    expect(ageBand(90)).toBe("61-90");
    expect(ageBand(91)).toBe("90+");
  });
});
