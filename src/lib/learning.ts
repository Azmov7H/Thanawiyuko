export const XP_DAILY_CAP = 600;
export const EXAM_BONUS_XP = 25;
export const EFFORT_XP = 2;
export const FAST_ANSWER_MS = 5000;
export const RE_SOLVE_PENALTY = 0.2;

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
};

export function baseCorrectXp(difficulty: Difficulty): number {
  return Math.round(10 * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function answerXp(input: {
  difficulty: Difficulty;
  correct: boolean;
  timeMs: number;
  firstAttempt: boolean;
  repeatedWithin24h: boolean;
}): number {
  if (!input.correct) return input.firstAttempt ? EFFORT_XP : 0;
  if (input.timeMs < FAST_ANSWER_MS && input.difficulty !== "easy") return 0;
  const base = baseCorrectXp(input.difficulty);
  return input.repeatedWithin24h ? Math.round(base * RE_SOLVE_PENALTY) : base;
}

export function applyDailyCap(requested: number, usedToday: number, cap = XP_DAILY_CAP): number {
  if (requested <= 0) return 0;
  const room = cap - usedToday;
  if (room <= 0) return 0;
  return Math.min(requested, room);
}

export function isStreakQualifying(input: {
  questionsAnswered: number;
  examSubmitted: boolean;
  studyMinutes?: number;
}): boolean {
  if (input.examSubmitted) return true;
  if (input.questionsAnswered >= 5) return true;
  return (input.studyMinutes ?? 0) >= 15 && input.questionsAnswered >= 3;
}
