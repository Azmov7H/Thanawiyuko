import { describe, expect, it } from "vitest";
import { isPlanKey, toPlanView } from "@/lib/plans";
import { PLANS } from "@/server/payments/config";

const monthly = PLANS.monthly;

describe("toPlanView", () => {
  it("maps the DB key to the public id", () => {
    const view = toPlanView({
      key: "monthly",
      nameAr: monthly.nameAr,
      nameEn: monthly.nameEn,
      priceEGP: monthly.priceEGP,
      durationDays: monthly.durationDays,
      features: monthly.features,
    });
    expect(view.id).toBe("monthly");
    expect(view.key).toBe("monthly");
    expect(view.priceEGP).toBe(monthly.priceEGP);
    expect(view.features).toEqual(monthly.features);
  });

  it("defaults popular to false when omitted", () => {
    const view = toPlanView({
      key: "monthly",
      nameAr: monthly.nameAr,
      nameEn: monthly.nameEn,
      priceEGP: monthly.priceEGP,
      durationDays: monthly.durationDays,
      features: monthly.features,
    });
    expect(view.popular).toBe(false);
  });
});

describe("isPlanKey", () => {
  it("accepts non-empty short strings and rejects the rest", () => {
    expect(isPlanKey("monthly")).toBe(true);
    expect(isPlanKey("")).toBe(false);
    expect(isPlanKey("   ")).toBe(false);
    expect(isPlanKey(42)).toBe(false);
    expect(isPlanKey("x".repeat(41))).toBe(false);
  });
});
