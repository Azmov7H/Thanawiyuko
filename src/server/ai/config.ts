import fs from "node:fs";
import path from "node:path";

/** Configuration for AI models (MVP — only two tiers + fallback). */
export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  maxInputTokens: number;
  costPer1kIn: number;
  costPer1kOut: number;
}

export const MODEL_TIERS = {
  tutor: "tutor",
  tutorPremium: "tutorPremium",
  fallback: "fallback",
} as const;

export type ModelTier = (typeof MODEL_TIERS)[keyof typeof MODEL_TIERS];

export interface AiConfig {
  /** Model IDs are resolved at runtime from env; these are logical tier names. */
  models: Record<ModelTier, ModelConfig>;
  /** Per-user daily quotas (MVP defaults; overridable via env). */
  dailyQuota: { free: number; plus: number };
  /** Per-minute rate limit. */
  perMinuteLimit: number;
  /** Max tokens in a single response. */
  responseCap: number;
  /** Identical-explanation cache TTL (seconds). */
  explanationCacheTtl: number;
  /** Budget alert threshold (0-1). */
  budgetAlertPct: number;
}

/** Load config from env with sensible defaults (overridden in production). */
export function loadAiConfig(): AiConfig {
  return {
    models: {
      tutor: {
        id: process.env.AI_MODEL_TUTOR ?? "openrouter/auto:cheap",
        name: "Tutor (fast)",
        maxTokens: 8192,
        maxInputTokens: 4000,
        costPer1kIn: 0.0002,
        costPer1kOut: 0.0006,
      },
      tutorPremium: {
        id: process.env.AI_MODEL_TUTOR_PREMIUM ?? "openrouter/auto:balanced",
        name: "Tutor (premium)",
        maxTokens: 16384,
        maxInputTokens: 8000,
        costPer1kIn: 0.001,
        costPer1kOut: 0.003,
      },
      fallback: {
        id: process.env.AI_MODEL_FALLBACK ?? "openrouter/auto:cheapest",
        name: "Fallback",
        maxTokens: 4096,
        maxInputTokens: 2000,
        costPer1kIn: 0.0001,
        costPer1kOut: 0.0002,
      },
    },
    dailyQuota: {
      free: Number(process.env.AI_QUOTA_FREE ?? 10),
      plus: Number(process.env.AI_QUOTA_PLUS ?? 100),
    },
    perMinuteLimit: Number(process.env.AI_PER_MINUTE_LIMIT ?? 8),
    responseCap: Number(process.env.AI_RESPONSE_CAP ?? 800),
    explanationCacheTtl: Number(process.env.AI_EXPLANATION_CACHE_TTL ?? 604800), // 7 days
    budgetAlertPct: Number(process.env.AI_BUDGET_ALERT_PCT ?? 0.8),
  };
}

/** Prompt template loader (versioned, file-based). */
const PROMPT_DIR = path.join(process.cwd(), "prompts");

export interface PromptTemplate {
  system: string;
  user: string; // may contain {{placeholders}}
  version: string;
}

export function loadPrompt(name: string, version = "v1"): PromptTemplate {
  const dir = path.join(PROMPT_DIR, version);
  const systemPath = path.join(dir, `${name}.system.md`);
  const userPath = path.join(dir, `${name}.user.md`);
  if (!fs.existsSync(systemPath) || !fs.existsSync(userPath)) {
    throw new Error(`Prompt not found: ${name}@${version}`);
  }
  return {
    system: fs.readFileSync(systemPath, "utf8"),
    user: fs.readFileSync(userPath, "utf8"),
    version,
  };
}

/** Simple placeholder interpolation. */
export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}