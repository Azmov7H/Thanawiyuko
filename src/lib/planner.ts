/**
 * Deterministic daily planner (M5, §4.8).
 * Inputs: targetExamDate, dailyMinutes, mastery map, mistakesDue, subjectWeights.
 * Output: today's action list with reasons.
 * AI only rewrites copy — never changes allocation.
 */

export type PlanTopicInput = {
  masteryScore: number;
  band: string;
  n: number;
  subjectId: string;
  examWeight: number;
};

export type PlanInput = {
  targetExamDate: Date | null;            // Cairo day
  dailyMinutes: number;
  /** topicId -> { masteryScore, band, n, subjectId, examWeight } */
  topics: Map<string, PlanTopicInput>;
  mistakesDue: Array<{ topicId: string; conceptTag: string | null }>;
  recentActivity: Record<string, number>; // topicId -> last practiced days ago
  subjectWeights: Map<string, number>;
};

export type PlanItem = {
  topicId: string;
  subjectId: string;
  action: "practice" | "review" | "lesson";
  minutes: number;
  reason: string;
  qCount?: number;
};

const MAX_TOPICS_PER_SUBJECT = 2;

/**
 * Greedy planner with explainable reasons.
 * 1) 20% time → mistakesDue (oldest first).
 * 2) Remaining → needScore = (100 - mastery) × examWeight × recencyNeglect × subjectWeightFactor
 *    Cap 2 topics/day/subject, sessions 15–45 min.
 * 3) Insert 1 spaced revision for a previously-mastered topic (idle >7d).
 * 4) If target <30d → shift 50% to timed mixed practice; if >90d → learning focus.
 */
export function generatePlan(input: PlanInput): PlanItem[] {
  const { targetExamDate, dailyMinutes, topics, mistakesDue, recentActivity, subjectWeights } = input;
  const total = dailyMinutes;
  const reviewBudget = Math.max(10, Math.floor(total * 0.2));
  const learningBudget = total - reviewBudget;

  const maxWeight = Math.max(1, ...subjectWeights.values());
  const subjectFactor = (subjectId: string) =>
    Math.max(0.1, (subjectWeights.get(subjectId) ?? 1) / maxWeight);

  const plan: PlanItem[] = [];
  const used: Record<string, number> = {}; // topicId -> minutes allocated today
  const subjectTopics: Record<string, number> = {};

  // 1) Mistake review due
  let reviewUsed = 0;
  for (const m of mistakesDue) {
    if (reviewUsed >= reviewBudget) break;
    const t = topics.get(m.topicId);
    if (!t) continue;
    const mins = Math.min(15, reviewBudget - reviewUsed);
    plan.push({
      topicId: m.topicId,
      subjectId: t.subjectId,
      action: "review",
      minutes: mins,
      reason: `مراجعة مستحقة — ${m.conceptTag ?? "أخطاء سابقة"} (مخطط SM-2)`,
      qCount: Math.max(3, Math.floor(mins / 3)),
    });
    reviewUsed += mins;
    used[m.topicId] = (used[m.topicId] ?? 0) + mins;
  }

  // 2) Weak topics needScore
  const needs = Array.from(topics.entries())
    .map(([topicId, d]) => {
      const daysSince = recentActivity[topicId] ?? 999;
      const recencyNeglect = daysSince > 14 ? 1.5 : daysSince > 7 ? 1.2 : 1.0;
      const factor = subjectFactor(d.subjectId);
      const need = (100 - d.masteryScore) * d.examWeight * recencyNeglect * factor;
      return { topicId, subjectId: d.subjectId, need, mastery: d.masteryScore, band: d.band, factor };
    })
    .filter((x) => x.band !== "mastered" || x.mastery < 100)
    .sort((a, b) => b.need - a.need);

  let learnUsed = 0;
  for (const x of needs) {
    if (learnUsed >= learningBudget) break;
    if ((used[x.topicId] ?? 0) >= 45) continue; // cap per topic
    if ((subjectTopics[x.subjectId] ?? 0) >= MAX_TOPICS_PER_SUBJECT) continue;
    const mins = Math.min(45, learningBudget - learnUsed);
    if (mins < 15) break;
    plan.push({
      topicId: x.topicId,
      subjectId: x.subjectId,
      action: x.band === "weak" ? "lesson" : "practice",
      minutes: mins,
      reason: `إتقان ${x.mastery < 50 ? "ضعيف" : "مقبول"} (${x.mastery}%) — وزن المادة ${Math.round(x.factor * 100)}%`,
      qCount: x.band === "weak" ? 5 : 10,
    });
    learnUsed += mins;
    used[x.topicId] = (used[x.topicId] ?? 0) + mins;
    subjectTopics[x.subjectId] = (subjectTopics[x.subjectId] ?? 0) + 1;
  }

  // 3) Spaced revision (mastered but idle >7d)
  const idleMastered = Array.from(topics.entries())
    .filter(([topicId, d]) => d.band === "mastered" && (recentActivity[topicId] ?? 0) > 7)
    .sort((a, b) => (recentActivity[a[0]] ?? 0) - (recentActivity[b[0]] ?? 0));
  if (idleMastered.length > 0 && plan.length < 5) {
    const [topicId, d] = idleMastered[0];
    if (learnUsed + 15 <= learningBudget && (subjectTopics[d.subjectId] ?? 0) < MAX_TOPICS_PER_SUBJECT) {
      plan.push({
        topicId,
        subjectId: d.subjectId,
        action: "practice",
        minutes: 15,
        reason: "مراجعة متباعدة — الموضوع محفوظ لكن لم يُراجع منذ أسبوع",
        qCount: 5,
      });
    }
  }

  // 4) Exam-close mode
  const daysLeft = targetExamDate ? Math.ceil((targetExamDate.getTime() - Date.now()) / (24 * 3600 * 1000)) : 999;
  if (daysLeft < 30 && plan.length > 0) {
    // Tag first item as mock-practice
    plan[0] = { ...plan[0], action: "practice", reason: `${plan[0].reason} (نمط امتحان — ${daysLeft} يوم متبقي)` };
  }

  return plan;
}
