export type RecommendationType = "review" | "quiz" | "lesson" | "mock";

export type Recommendation = {
  type: RecommendationType;
  reason: string;
  href: string;
  topicId?: string;
  subjectId?: string;
  lessonId?: string;
  qCount?: number;
};

export type RecommendationInput = {
  mistakesDue: number;
  weakestTopic: {
    topicId: string;
    subjectId: string;
    masteryScore: number;
  } | null;
  lessonForRepeatedMistake: {
    lessonId: string;
    conceptTag: string | null;
  } | null;
  readiness: number;
  daysToExam: number;
};

const MAX_RECOMMENDATIONS = 3;
const MINI_MOCK_READINESS = 60;
const MINI_MOCK_MAX_DAYS = 45;

/** Deterministic ranked "next" list (§4.14); AI never ranks in MVP. */
export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const items: Recommendation[] = [];

  if (input.mistakesDue > 0) {
    items.push({
      type: "review",
      href: "/mistakes",
      reason: `لديك ${input.mistakesDue} مراجعة مستحقة من أخطائك السابقة — ابدأ بها.`,
    });
  }

  if (input.weakestTopic) {
    const t = input.weakestTopic;
    items.push({
      type: "quiz",
      href: `/subjects/${t.subjectId}`,
      topicId: t.topicId,
      subjectId: t.subjectId,
      qCount: 10,
      reason: `أضعف موضوع لديك (${t.masteryScore}%) — تدرب عليه الآن بعشرة أسئلة.`,
    });
  }

  if (input.lessonForRepeatedMistake) {
    const l = input.lessonForRepeatedMistake;
    items.push({
      type: "lesson",
      href: `/lessons/${l.lessonId}`,
      lessonId: l.lessonId,
      reason: l.conceptTag
        ? `شرح مبسّط لمفهوم تكرر خطؤك فيه: «${l.conceptTag}».`
        : "شرح مبسّط لمفهوم تكرر خطؤك فيه.",
    });
  }

  if (input.readiness < MINI_MOCK_READINESS && input.daysToExam < MINI_MOCK_MAX_DAYS) {
    items.push({
      type: "mock",
      href: "/exams",
      reason: `استعدادك ${input.readiness}% وتبقّى ${input.daysToExam} يومًا — امتحان تجريبي موقوت يقيس مستواك.`,
    });
  }

  return items.slice(0, MAX_RECOMMENDATIONS);
}
