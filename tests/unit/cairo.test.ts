import { describe, expect, it } from "vitest";
import { cairoDayKey, cairoDayStartUTC, isSameCairoDay } from "@/lib/cairo";

describe("cairoDayKey", () => {
  it("maps a winter UTC instant to the +2 Cairo day", () => {
    // 2026-01-01T00:30Z = 02:30 Cairo (standard, UTC+2) → same day
    expect(cairoDayKey(new Date("2026-01-01T00:30:00Z"))).toBe("2026-01-01");
  });

  it("rolls the Cairo day at the 00:00 boundary", () => {
    // 2025-12-31T22:30Z = 2026-01-01T00:30 Cairo
    expect(cairoDayKey(new Date("2025-12-31T22:30:00Z"))).toBe("2026-01-01");
    expect(cairoDayKey(new Date("2025-12-31T21:30:00Z"))).toBe("2025-12-31");
  });

  it("uses +3 during Egypt DST (summer)", () => {
    // 2026-07-01T20:30Z = 23:30 Cairo (DST) → same day
    expect(cairoDayKey(new Date("2026-07-01T20:30:00Z"))).toBe("2026-07-01");
    // 2026-07-01T21:30Z = 00:30 next day Cairo
    expect(cairoDayKey(new Date("2026-07-01T21:30:00Z"))).toBe("2026-07-02");
  });
});

describe("isSameCairoDay", () => {
  it("compares across the UTC midnight but same Cairo day", () => {
    const a = new Date("2025-12-31T22:00:00Z"); // 00:00+ Cairo Jan 1
    const b = new Date("2026-01-01T00:00:00Z"); // 02:00 Cairo Jan 1
    expect(isSameCairoDay(a, b)).toBe(true);
  });
});

describe("cairoDayStartUTC", () => {
  it("returns 22:00Z previous day in winter (+2)", () => {
    expect(cairoDayStartUTC(new Date("2026-01-15T12:00:00Z")).toISOString()).toBe(
      "2026-01-14T22:00:00.000Z",
    );
  });

  it("returns 21:00Z previous day in summer DST (+3)", () => {
    expect(cairoDayStartUTC(new Date("2026-07-15T12:00:00Z")).toISOString()).toBe(
      "2026-07-14T21:00:00.000Z",
    );
  });
});
