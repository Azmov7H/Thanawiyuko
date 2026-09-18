import { afterEach, describe, expect, it } from "vitest";
import { isFeatureEnabled, getAllFlags } from "@/lib/features";
import { featureGate } from "@/server/feature-gate";

const FLAG_ENV_KEYS = [
  "FEATURE_AI_ENABLED",
  "FEATURE_AI_FALLBACK_ONLY",
  "FEATURE_PAYMENTS_ENABLED",
  "FEATURE_PAYMENTS_MANUAL_MODE",
  "FEATURE_EXAMS_ENABLED",
  "FEATURE_LEADERBOARD_ENABLED",
  "FEATURE_MAINTENANCE_MODE",
  "FEATURE_NEW_UI_ENABLED",
] as const;

afterEach(() => {
  for (const key of FLAG_ENV_KEYS) {
    delete process.env[key];
  }
});

describe("feature flags (kill switches)", () => {
  it("defaults to documented shipped defaults", () => {
    expect(isFeatureEnabled("AI_ENABLED")).toBe(true);
    expect(isFeatureEnabled("PAYMENTS_ENABLED")).toBe(true);
    expect(isFeatureEnabled("EXAMS_ENABLED")).toBe(true);
    expect(isFeatureEnabled("MAINTENANCE_MODE")).toBe(false);
    expect(isFeatureEnabled("LEADERBOARD_ENABLED")).toBe(false);
  });

  it("honors env overrides for 'true'/'1' forms", () => {
    process.env.FEATURE_MAINTENANCE_MODE = "true";
    process.env.FEATURE_PAYMENTS_ENABLED = "1";
    process.env.FEATURE_AI_ENABLED = "0";
    expect(isFeatureEnabled("MAINTENANCE_MODE")).toBe(true);
    expect(isFeatureEnabled("PAYMENTS_ENABLED")).toBe(true);
    expect(isFeatureEnabled("AI_ENABLED")).toBe(false);
  });

  it("reports all flags for the admin/debug surface", () => {
    process.env.FEATURE_LEADERBOARD_ENABLED = "true";
    const flags = getAllFlags();
    expect(flags.LEADERBOARD_ENABLED).toBe(true);
    expect(flags.MAINTENANCE_MODE).toBe(false);
  });
});

describe("featureGate", () => {
  it("returns null when the feature is enabled", () => {
    expect(featureGate("AI_ENABLED")).toBeNull();
  });

  it("returns a 503 response when disabled", async () => {
    process.env.FEATURE_EXAMS_ENABLED = "false";
    const gate = featureGate("EXAMS_ENABLED");
    expect(gate).not.toBeNull();
    expect(gate!.status).toBe(503);
    expect(gate!.headers.get("Retry-After")).toBe("60");
    const body = await gate!.json();
    expect(body.error.code).toBe("FEATURE_DISABLED");
    expect(body.error.flag).toBe("EXAMS_ENABLED");
  });
});