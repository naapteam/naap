import { describe, expect, it } from "vitest";
import { formatCft, formatDate, formatDateTime, formatInr } from "../format";

describe("formatInr (UI spec §4: Indian grouping, Latin digits)", () => {
  it("groups by the Indian numbering system", () => {
    expect(formatInr(1245600)).toBe("₹12,45,600");
  });

  it("uses Latin digits even though the app may be in Hindi/Marathi/Gujarati", () => {
    expect(formatInr(1000)).toMatch(/^[₹0-9,]+$/);
  });

  it("shows no decimals for whole rupees", () => {
    expect(formatInr(500)).toBe("₹500");
  });
});

describe("formatCft (architecture §4: 2 decimals for display)", () => {
  it("always shows exactly 2 decimals", () => {
    expect(formatCft(6.75)).toBe("6.75");
    expect(formatCft(6)).toBe("6.00");
    expect(formatCft(6.023)).toBe("6.02");
  });

  it("groups large values with Indian commas", () => {
    expect(formatCft(123456.5)).toBe("1,23,456.50");
  });
});

describe("formatDate / formatDateTime (spec: DD-MM-YYYY, never locale-dependent)", () => {
  it("formats as DD-MM-YYYY", () => {
    expect(formatDate(new Date(2026, 8, 12))).toBe("12-09-2026");
  });

  it("zero-pads day and month", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05-01-2026");
  });

  it("appends zero-padded time for formatDateTime", () => {
    expect(formatDateTime(new Date(2026, 8, 12, 9, 5))).toBe(
      "12-09-2026 09:05",
    );
  });
});
