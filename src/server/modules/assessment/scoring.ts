import { shuffled } from "@/lib/random";
import type { QuestionSnapshot } from "./attempt.model";

export type GradableQuestion = Pick<
  QuestionSnapshot,
  "qId" | "type" | "correctKeys"
>;

export type SubmittedAnswer = {
  qId: string;
  chosenKeys: string[];
  timeMs: number;
};

export type GradedAnswer = {
  qId: string;
  chosenKeys: string[];
  correct: boolean;
  skipped: boolean;
  timeMs: number;
};

function sameKeys(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((k) => set.has(k));
}

/**
 * Deterministic scoring, server-side only (§4.4, §21).
 * No negative marking. Skipped = 0 + flagged. Single + TF: exact match.
 */
export function gradeAnswers(
  questions: GradableQuestion[],
  answers: SubmittedAnswer[],
): GradedAnswer[] {
  const byId = new Map(answers.map((a) => [String(a.qId), a]));
  return questions.map((q) => {
    const id = String(q.qId);
    const a = byId.get(id);
    if (!a || a.chosenKeys.length === 0) {
      return { qId: id, chosenKeys: [], correct: false, skipped: true, timeMs: a?.timeMs ?? 0 };
    }
    return {
      qId: id,
      chosenKeys: a.chosenKeys,
      correct: sameKeys(a.chosenKeys, q.correctKeys),
      skipped: false,
      timeMs: Math.max(0, a.timeMs ?? 0),
    };
  });
}

export function scoreOf(graded: GradedAnswer[]): { score: number; accuracy: number } {
  const score = graded.filter((g) => g.correct).length;
  const accuracy = graded.length === 0 ? 0 : Math.round((score / graded.length) * 100);
  return { score, accuracy };
}

/** Public question view — the ONLY shape practice APIs may send pre-submit. */
export type PublicQuestion = {
  qId: string;
  type: string;
  stemMD: string;
  options: Array<{ key: string; text: string }>;
  difficulty: string;
};

const LEAK_KEYS = ["correctKeys", "explanationMD", "correct", "isCorrect", "answer"];

export function toPublic(snapshots: QuestionSnapshot[]): PublicQuestion[] {
  return snapshots.map((s) => ({
    qId: String(s.qId),
    type: s.type,
    stemMD: s.stemMD,
    options: s.options.map((o) => ({ key: o.key, text: o.text })),
    difficulty: s.difficulty,
  }));
}

/** Test/route guard: assert a payload carries no answer material. */
export function assertNoLeak(payload: unknown): void {
  const seen = JSON.stringify(payload);
  for (const k of LEAK_KEYS) {
    if (seen.includes(`"${k}"`)) throw new Error(`Answer leak detected: ${k}`);
  }
}

/** Difficulty-balanced sampling: hard ≥ asked share, fill from available. */
export function sampleOrder<T>(items: readonly T[], seed: number): T[] {
  return shuffled(items, seed);
}

/* ---------------- M4: deadlines, blueprints, analysis ---------------- */

/** Grace window for late auto-submit (server clock authoritative). */
export const SUBMIT_GRACE_MS = 60_000;

export function isPastDeadline(deadlineMs: number, nowMs: number): boolean {
  return nowMs > deadlineMs + SUBMIT_GRACE_MS;
}

export type BlueprintNeed = { topicId: string; count: number };

/**
 * Publish gate: every blueprint row must have enough published questions.
 * Returns human-readable deficits (empty = ready to publish).
 */
export function validateBlueprint(
  rows: BlueprintNeed[],
  available: Map<string, number> | Record<string, number>,
): string[] {
  const get = (k: string) =>
    available instanceof Map ? (available.get(k) ?? 0) : (available[k] ?? 0);
  return rows
    .filter((r) => get(r.topicId) < r.count)
    .map((r) => `topic ${r.topicId}: needs ${r.count}, has ${get(r.topicId)}`);
}

export type TopicStat = {
  topicId: string;
  total: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
};

export type ExamAnalysis = {
  score: number;
  total: number;
  accuracy: number;
  totalTimeMs: number;
  perTopic: TopicStat[];
  /** conceptTags most frequent among wrong answers (top 3). */
  misconceptions: Array<{ tag: string; misses: number }>;
  /** Deterministic next actions: worst topics first (max 3). */
  nextTopics: string[];
};

/**
 * Post-submit exam analysis from snapshots + final answers (deterministic, §22).
 * Numbers come from code; any AI narrative (V1.1) only rewords this output.
 */
export function analyzeAttempt(
  snapshots: Array<{
    qId: unknown;
    topicId: unknown;
    conceptTags?: string[];
  }>,
  graded: GradedAnswer[],
): ExamAnalysis {
  const byId = new Map(graded.map((g) => [g.qId, g]));
  const topicAgg = new Map<string, { total: number; correct: number; time: number }>();
  const missTags = new Map<string, number>();
  let totalTimeMs = 0;

  for (const s of snapshots) {
    const g = byId.get(String(s.qId));
    if (!g) continue;
    const t = String(s.topicId);
    const agg = topicAgg.get(t) ?? { total: 0, correct: 0, time: 0 };
    agg.total += 1;
    if (g.correct) agg.correct += 1;
    else for (const tag of s.conceptTags ?? []) missTags.set(tag, (missTags.get(tag) ?? 0) + 1);
    agg.time += g.timeMs;
    totalTimeMs += g.timeMs;
    topicAgg.set(t, agg);
  }

  const perTopic: TopicStat[] = [...topicAgg.entries()].map(([topicId, a]) => ({
    topicId,
    total: a.total,
    correct: a.correct,
    accuracy: a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100),
    avgTimeMs: a.total === 0 ? 0 : Math.round(a.time / a.total),
  }));
  perTopic.sort((x, y) => x.accuracy - y.accuracy || y.total - x.total);

  const misconceptions = [...missTags.entries()]
    .map(([tag, misses]) => ({ tag, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 3);

  const { score, accuracy } = scoreOf(graded);
  return {
    score,
    total: graded.length,
    accuracy,
    totalTimeMs,
    perTopic,
    misconceptions,
    nextTopics: perTopic.filter((t) => t.accuracy < 100).slice(0, 3).map((t) => t.topicId),
  };
}
