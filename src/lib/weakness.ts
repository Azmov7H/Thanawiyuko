export const WEAK_MIN_N = 5;
export const WEAK_MASTERY_MAX = 50;
export const WEAK_ACCURACY_MAX = 50;
export const WEAK_CONCEPT_REPEATS = 2;

export type WeakTopicSignals = {
  masteryScore: number;
  n: number;
  last10Accuracy: number;
  conceptRepeatCount: number;
};

export function isWeakTopic(i: WeakTopicSignals): boolean {
  if (i.n >= WEAK_MIN_N && i.masteryScore < WEAK_MASTERY_MAX) return true;
  if (i.n >= WEAK_MIN_N && i.last10Accuracy < WEAK_ACCURACY_MAX) return true;
  return i.conceptRepeatCount >= WEAK_CONCEPT_REPEATS;
}

export function weakTopicScore(i: { masteryScore: number; examWeight: number }): number {
  return i.examWeight * (100 - i.masteryScore);
}
