import { describe, expect, it } from "vitest";
import { complianceTone, daysUntil } from "../compliance";

const now = new Date("2026-09-13T00:00:00Z");
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("complianceTone (UI spec §6.8a)", () => {
  it("is null with no expiry date", () => {
    expect(complianceTone(null, now)).toBeNull();
  });

  it("is ready (green) well before expiry", () => {
    expect(complianceTone(daysFromNow(90), now)).toBe("ready");
  });

  it("is wip (ochre) at exactly 60 days out", () => {
    expect(complianceTone(daysFromNow(60), now)).toBe("wip");
  });

  it("is wip (ochre) just inside the 60-day window", () => {
    expect(complianceTone(daysFromNow(45), now)).toBe("wip");
  });

  it("is alert (red) at exactly 7 days out", () => {
    expect(complianceTone(daysFromNow(7), now)).toBe("alert");
  });

  it("is alert (red) once already expired", () => {
    expect(complianceTone(daysFromNow(-5), now)).toBe("alert");
  });
});

describe("daysUntil", () => {
  it("computes whole days remaining", () => {
    expect(daysUntil(daysFromNow(10), now)).toBe(10);
  });

  it("goes negative once expired", () => {
    expect(daysUntil(daysFromNow(-3), now)).toBe(-3);
  });
});
