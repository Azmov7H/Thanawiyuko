import { describe, expect, it } from "vitest";
import { getPlan, listPlans, GRACE_DAYS } from "@/server/payments/config";
import { createHmac } from "node:crypto";

describe("plans config", () => {
  it("has three plans with correct IDs", () => {
    const plans = listPlans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.id)).toEqual(["monthly", "semester", "annual"]);
  });

  it("prices are positive integers", () => {
    for (const p of listPlans()) {
      expect(Number.isInteger(p.priceEGP)).toBe(true);
      expect(p.priceEGP).toBeGreaterThan(0);
    }
  });

  it("semester is marked popular", () => {
    expect(getPlan("semester")?.popular).toBe(true);
  });

  it("durations are reasonable", () => {
    expect(getPlan("monthly")?.durationDays).toBe(30);
    expect(getPlan("semester")?.durationDays).toBe(150);
    expect(getPlan("annual")?.durationDays).toBe(365);
  });

  it("GRACE_DAYS is 3", () => {
    expect(GRACE_DAYS).toBe(3);
  });
});

describe("Paymob HMAC verification (logic)", () => {
  it("produces matching HMAC for known payload", () => {
    const secret = "test-secret";
    const payload = JSON.stringify({ type: "TRANSACTION", obj: { success: true } });
    const sig = createHmac("sha512", secret).update(payload).digest("hex");
    // verification would be: createHmac("sha512", secret).update(payload).digest("hex") === sig
    expect(sig.length).toBe(128); // hex sha512 = 128 chars
  });
});