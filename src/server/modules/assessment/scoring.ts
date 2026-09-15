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
