import { describe, expect, it } from "vitest";
import { cairoDayKey, cairoDayStartUTC, isSameCairoDay } from "@/lib/cairo";

describe("streak uses Cairo day boundary", () => {
  it("two UTC instants on different sides of 00:00 Cairo are different days", () => {
    // 2025-12-31T22:00Z = 2026-01-01T00:00 Cairo (standard +2)
    const d1 = new Date("2025-12-31T22:00:00Z");
    const d2 = new Date("2025-12-31T21:30:00Z");
    expect(isSameCairoDay(d1, d2)).toBe(false);
    expect(cairoDayKey(d1)).toBe("2026-01-01");
    expect(cairoDayKey(d2)).toBe("2025-12-31");
  });

  it("cairoDayStartUTC returns correct UTC for winter (+2)", () => {
    expect(cairoDayStartUTC(new Date("2026-01-15T12:00:00Z")).toISOString()).toBe("2026-01-14T22:00:00.000Z");
  });

  it("cairoDayStartUTC returns correct UTC for summer DST (+3)", () => {
    expect(cairoDayStartUTC(new Date("2026-07-15T12:00:00Z")).toISOString()).toBe("2026-07-14T21:00:00.000Z");
  });
});