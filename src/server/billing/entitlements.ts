import { loadAiConfig } from "@/server/ai/config";

/** Central Free vs Plus capability matrix (README §3.3). Server is the sole authority. */

export const FREE_PRACTICE_DAILY_DEFAULT = 30;
export const FREE_MISTAKES_HISTORY = 20;
export const PLUS_MISTAKES_HISTORY = 200;
export const FREE_MOCK_ATTEMPTS = 1;
export const FREE_STUDY_PLAN_ITEMS = 3;

export type Entitlements = {
  isPlus: boolean;
  practiceDailyQuota: number;
  aiDailyQuota: number;
  mockAttemptsAllowed: number;
  fullMockAccess: boolean;
  mistakesHistoryLimit: number;
  adaptivePlan: boolean;
  studyPlanPreviewItems: number;
};

export function freePracticeDailyLimit(): number {
  const n = Number(process.env.FREE_PRACTICE_DAILY_LIMIT ?? process.env.PRACTICE_DAILY_LIMIT ?? FREE_PRACTICE_DAILY_DEFAULT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : FREE_PRACTICE_DAILY_DEFAULT;
}

/** Pure resolver — safe to unit test without a database. */
export function entitlementsFor(isPlus: boolean): Entitlements {
  const ai = loadAiConfig();
  return {
    isPlus,
    practiceDailyQuota: isPlus ? Number.POSITIVE_INFINITY : freePracticeDailyLimit(),
    aiDailyQuota: isPlus ? ai.dailyQuota.plus : ai.dailyQuota.free,
    mockAttemptsAllowed: isPlus ? Number.POSITIVE_INFINITY : FREE_MOCK_ATTEMPTS,
    fullMockAccess: isPlus,
    mistakesHistoryLimit: isPlus ? PLUS_MISTAKES_HISTORY : FREE_MISTAKES_HISTORY,
    adaptivePlan: isPlus,
    studyPlanPreviewItems: FREE_STUDY_PLAN_ITEMS,
  };
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const { hasPlusAccess } = await import("@/server/billing/service");
  return entitlementsFor(await hasPlusAccess(userId));
}
