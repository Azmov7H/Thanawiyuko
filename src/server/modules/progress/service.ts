import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel, levelFromXP } from "@/server/modules/gamification/xp.model";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { buildPlanContext } from "@/server/modules/planning/plan-input";
import { LessonModel } from "@/server/modules/academic/content.models";
import { generatePlan } from "@/lib/planner";
import { cairoDayKey, cairoDayStartUTC } from "@/lib/cairo";
import { isWeakTopic, weakTopicScore } from "@/lib/weakness";
import { computeReadiness } from "@/lib/readiness";
import { buildRecommendations } from "@/lib/recommendations";

export type ProgressSnapshot = {
  xp: { total: number; today: number; level: number };
  streak: { current: number; longest: number };
  subjects: Array<{ subjectId: string; nameAr: string; mastery: number; topics: number }>;
  weakTopics: Array<{ topicId: string; masteryScore: number; n: number }>;
  readiness: number;
  next: Array<{ type: string; reason: string; href: string; qCount?: number }>;
  mistakesDue: number;
  plan: Array<{ topicId: string; subjectId: string; action: "practice" | "review" | "lesson"; minutes: number; reason: string; qCount?: number }>;
};

export type ProgressProfileInput = {
  grade?: string | null;
  track?: string | null;
  targetExamDate?: Date | string | null;
  dailyMinutes?: number;
};

/** Unified progress snapshot — single source for the dashboard API and PDF reports. */
export async function getProgressSnapshot(
  userId: string,
  profile: ProgressProfileInput,
): Promise<ProgressSnapshot> {
  await dbConnect();
  const studentObjectId = new mongoose.Types.ObjectId(userId);

  const today = cairoDayStartUTC();
  const [mastery, mistakes, streak, xpAgg] = await Promise.all([
    TopicMasteryModel.find({ studentId: userId }).lean(),
    MistakeModel.find({ studentId: userId, dueAt: { $lte: today }, resolvedAt: null }).lean(),
    StreakModel.findOne({ studentId: userId }).lean(),
    XPTransactionModel.aggregate([
      { $match: { studentId: studentObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          today: { $sum: { $cond: [{ $gte: ["$createdAt", cairoDayStartUTC()] }, "$amount", 0] } },
        },
      },
    ]),
  ]);
  const totalXP = xpAgg[0]?.total ?? 0;
  const todayXP = xpAgg[0]?.today ?? 0;

  const context = await buildPlanContext(userId, profile as never);

  const subjAgg = new Map<string, { total: number; sum: number }>();
  for (const t of context.topics.values()) {
    const agg = subjAgg.get(t.subjectId) ?? { total: 0, sum: 0 };
    agg.total += 1;
    agg.sum += t.masteryScore;
    subjAgg.set(t.subjectId, agg);
  }
  const subjectProgress = context.subjects.map((sbj) => {
    const agg = subjAgg.get(sbj.subjectId);
    return {
      subjectId: sbj.subjectId,
      nameAr: sbj.nameAr,
      mastery: agg?.total ? Math.round(agg.sum / agg.total) : 0,
      topics: agg?.total ?? 0,
    };
  });

  const weakRows = mastery
    .map((m) => {
      const topicId = String(m.topicId);
      const topic = context.topics.get(topicId);
      if (!topic) return null;
      const repeat = context.conceptRepeats.get(topicId);
      const conceptRepeatCount = repeat?.count ?? 0;
      if (
        !isWeakTopic({
          masteryScore: m.masteryScore,
          n: m.n,
          last10Accuracy: m.last10Accuracy,
          conceptRepeatCount,
        })
      ) {
        return null;
      }
      const examWeight = context.subjectWeights.get(topic.subjectId) ?? 10;
      return {
        topicId,
        subjectId: topic.subjectId,
        masteryScore: m.masteryScore,
        n: m.n,
        score: weakTopicScore({ masteryScore: m.masteryScore, examWeight }),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score);

  const weakTopics = weakRows.slice(0, 5).map(({ topicId, masteryScore, n }) => ({ topicId, masteryScore, n }));

  const readiness = computeReadiness(
    Array.from(context.topics.values()).map((t) => ({
      subjectId: t.subjectId,
      masteryScore: t.masteryScore,
      weight: t.n,
    })),
    context.subjectWeights,
  );

  const repeated = [...context.conceptRepeats.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)[0];
  const repeatedTopicId = repeated?.[0];
  const lesson = repeatedTopicId
    ? await LessonModel.findOne({ topicId: repeatedTopicId, status: "published" })
        .select("_id")
        .sort({ order: 1 })
        .lean()
    : null;

  const targetExamDate = profile.targetExamDate ? new Date(profile.targetExamDate) : null;
  const daysToExam = targetExamDate
    ? Math.ceil((targetExamDate.getTime() - Date.now()) / (24 * 3600 * 1000))
    : 999;

  const next = buildRecommendations({
    mistakesDue: mistakes.length,
    weakestTopic: weakRows[0]
      ? {
          topicId: weakRows[0].topicId,
          subjectId: weakRows[0].subjectId,
          masteryScore: weakRows[0].masteryScore,
        }
      : null,
    lessonForRepeatedMistake: lesson ? { lessonId: String(lesson._id), conceptTag: repeated?.[1].tag ?? null } : null,
    readiness,
    daysToExam,
  });

  const todayKey = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: todayKey }).lean();
  if (!plan) {
    const planItems = generatePlan(context.planInput);
    plan = { items: planItems, date: todayKey } as { items: ReturnType<typeof generatePlan>; date: string };
  }
  const planItems = plan?.items ?? [];

  return {
    xp: { total: totalXP, today: todayXP, level: levelFromXP(totalXP) },
    streak: streak ? { current: streak.current, longest: streak.longest } : { current: 0, longest: 0 },
    subjects: subjectProgress,
    weakTopics,
    readiness,
    next,
    mistakesDue: mistakes.length,
    plan: planItems,
  };
}