import { describe, expect, it } from "vitest";
import { buildLotCode, lotCodePrefix, yearMonthCode } from "../lotCode";

describe("buildLotCode", () => {
  it("matches the architecture doc's worked example (TK-2609-01)", () => {
    expect(buildLotCode("TK", new Date(2026, 8, 13), 1)).toBe("TK-2609-01");
  });

  it("zero-pads the sequence to 2 digits", () => {
    expect(buildLotCode("SA", new Date(2026, 0, 1), 7)).toBe("SA-2601-07");
  });

  it("does not truncate a sequence past 99", () => {
    expect(buildLotCode("TK", new Date(2026, 0, 1), 123)).toBe("TK-2601-123");
  });

  it("uppercases the species code", () => {
    expect(buildLotCode("tk", new Date(2026, 8, 1), 1)).toBe("TK-2609-01");
  });
});

describe("yearMonthCode", () => {
  it("formats as YYMM", () => {
    expect(yearMonthCode(new Date(2026, 8, 13))).toBe("2609");
  });

  it("pads single-digit months", () => {
    expect(yearMonthCode(new Date(2026, 0, 13))).toBe("2601");
  });
});

describe("lotCodePrefix", () => {
  it("matches the non-sequence part of buildLotCode's output", () => {
    const date = new Date(2026, 8, 13);
    const full = buildLotCode("TK", date, 5);
    expect(full.startsWith(lotCodePrefix("TK", date))).toBe(true);
  });
});
