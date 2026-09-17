/** Feature Flags — centralized, env-driven, with typed access. */

export type FeatureFlag =
  | "AI_ENABLED"
  | "AI_FALLBACK_ONLY"
  | "PAYMENTS_ENABLED"
  | "PAYMENTS_MANUAL_MODE"
  | "EXAMS_ENABLED"
  | "LEADERBOARD_ENABLED"
  | "MAINTENANCE_MODE"
  | "NEW_UI_ENABLED";

const DEFAULTS: Record<FeatureFlag, boolean> = {
  AI_ENABLED: true,
  AI_FALLBACK_ONLY: false,
  PAYMENTS_ENABLED: true,
  PAYMENTS_MANUAL_MODE: false,
  EXAMS_ENABLED: true,
  LEADERBOARD_ENABLED: false,
  MAINTENANCE_MODE: false,
  NEW_UI_ENABLED: false,
};

function getEnvFlag(name: FeatureFlag): boolean | undefined {
  const val = process.env[`FEATURE_${name}`];
  if (val === undefined) return undefined;
  return val === "1" || val.toLowerCase() === "true";
}

/** Get flag value (env overrides default). */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const env = getEnvFlag(flag);
  return env ?? DEFAULTS[flag];
}

/** All flags for admin UI / debugging. */
export function getAllFlags(): Record<FeatureFlag, boolean> {
  return Object.keys(DEFAULTS).reduce((acc, key) => {
    acc[key as FeatureFlag] = isFeatureEnabled(key as FeatureFlag);
    return acc;
  }, {} as Record<FeatureFlag, boolean>);
}

/** Client-safe subset (only flags safe to expose to browser). */
export const CLIENT_FLAGS: FeatureFlag[] = [
  "AI_ENABLED",
  "EXAMS_ENABLED",
  "LEADERBOARD_ENABLED",
  "NEW_UI_ENABLED",
];

export function getClientFlags(): Record<string, boolean> {
  const all = getAllFlags();
  return CLIENT_FLAGS.reduce((acc, k) => { acc[k] = all[k]; return acc; }, {} as Record<string, boolean>);
}