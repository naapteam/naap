import { describe, expect, it } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row from the first object's keys", () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe("a,b\n1,2");
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    expect(toCsv([{ name: 'Rane "Timber", Traders' }])).toBe(
      'name\n"Rane ""Timber"", Traders"',
    );
  });

  it("handles multiple rows", () => {
    expect(
      toCsv([
        { species: "Teak", cft: 10 },
        { species: "Sal", cft: 20 },
      ]),
    ).toBe("species,cft\nTeak,10\nSal,20");
  });
});
