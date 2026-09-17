import { describe, expect, it } from "vitest";
import {
  FREE_MISTAKES_HISTORY,
  FREE_MOCK_ATTEMPTS,
  FREE_STUDY_PLAN_ITEMS,
  entitlementsFor,
  freePracticeDailyLimit,
} from "@/server/billing/entitlements";

describe("entitlementsFor (§3.3)", () => {
  it("applies free caps", () => {
    const e = entitlementsFor(false);
    expect(e.isPlus).toBe(false);
    expect(e.practiceDailyQuota).toBe(freePracticeDailyLimit());
    expect(e.mockAttemptsAllowed).toBe(FREE_MOCK_ATTEMPTS);
    expect(e.fullMockAccess).toBe(false);
    expect(e.mistakesHistoryLimit).toBe(FREE_MISTAKES_HISTORY);
    expect(e.adaptivePlan).toBe(false);
    expect(e.studyPlanPreviewItems).toBe(FREE_STUDY_PLAN_ITEMS);
  });

  it("lifts caps for plus", () => {
    const plus = entitlementsFor(true);
    const free = entitlementsFor(false);
    expect(plus.isPlus).toBe(true);
    expect(plus.practiceDailyQuota).toBe(Number.POSITIVE_INFINITY);
    expect(plus.mockAttemptsAllowed).toBe(Number.POSITIVE_INFINITY);
    expect(plus.fullMockAccess).toBe(true);
    expect(plus.adaptivePlan).toBe(true);
    expect(plus.mistakesHistoryLimit).toBeGreaterThan(free.mistakesHistoryLimit);
    expect(plus.aiDailyQuota).toBeGreaterThanOrEqual(free.aiDailyQuota);
  });

  it("honors an env override for the free practice quota", () => {
    const prev = process.env.FREE_PRACTICE_DAILY_LIMIT;
    process.env.FREE_PRACTICE_DAILY_LIMIT = "7";
    expect(freePracticeDailyLimit()).toBe(7);
    expect(entitlementsFor(false).practiceDailyQuota).toBe(7);
    if (prev === undefined) delete process.env.FREE_PRACTICE_DAILY_LIMIT;
    else process.env.FREE_PRACTICE_DAILY_LIMIT = prev;
  });
});
