export type ReadinessTopic = {
  subjectId: string;
  masteryScore: number;
  weight: number;
};

/**
 * Readiness (§4.4): subject mastery = weighted avg of its topics (weight = n),
 * then overall = avg of subjects weighted by exam weight.
 */
export function computeReadiness(
  topics: ReadinessTopic[],
  subjectWeights: Map<string, number>,
): number {
  const bySubject = new Map<string, { sum: number; weight: number }>();
  for (const t of topics) {
    const agg = bySubject.get(t.subjectId) ?? { sum: 0, weight: 0 };
    agg.sum += t.masteryScore * t.weight;
    agg.weight += t.weight;
    bySubject.set(t.subjectId, agg);
  }
  if (bySubject.size === 0) return 0;

  let total = 0;
  let weightSum = 0;
  for (const [subjectId, agg] of bySubject) {
    const mastery = agg.weight > 0 ? agg.sum / agg.weight : 0;
    const subjectWeight = subjectWeights.get(subjectId) ?? 10;
    total += mastery * subjectWeight;
    weightSum += subjectWeight;
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}
