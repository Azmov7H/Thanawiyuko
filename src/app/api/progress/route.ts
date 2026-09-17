import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel, levelFromXP } from "@/server/modules/gamification/xp.model";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { buildPlanContext } from "@/server/modules/planning/plan-input";
import { generatePlan } from "@/lib/planner";
import { cairoDayKey, cairoDayStartUTC } from "@/lib/cairo";
import { isWeakTopic, weakTopicScore } from "@/lib/weakness";

/** GET /api/progress — unified progress snapshot (dashboard feed). */
export async function GET() {
  const s = await studentOfSession();
  if (!s) return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;

  const today = cairoDayStartUTC();
  const [mastery, mistakes, streak, xpAgg] = await Promise.all([
    TopicMasteryModel.find({ studentId: userId }).lean(),
    MistakeModel.find({ studentId: userId, dueAt: { $lte: today }, resolvedAt: null }).lean(),
    StreakModel.findOne({ studentId: userId }).lean(),
    XPTransactionModel.aggregate([
      { $match: { studentId: userId } },
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

  const context = await buildPlanContext(userId, profile);

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

  const weakTopics = mastery
    .map((m) => {
      const topicId = String(m.topicId);
      const topic = context.topics.get(topicId);
      if (!topic) return null;
      const conceptRepeatCount = context.conceptRepeats.get(topicId) ?? 0;
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
        masteryScore: m.masteryScore,
        n: m.n,
        score: weakTopicScore({ masteryScore: m.masteryScore, examWeight }),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ topicId, masteryScore, n }) => ({ topicId, masteryScore, n }));

  const todayKey = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: todayKey }).lean();
  if (!plan) {
    const planItems = generatePlan(context.planInput);
    plan = { items: planItems, date: todayKey } as { items: typeof planItems; date: string };
  }

  return NextResponse.json({
    xp: { total: totalXP, today: todayXP, level: levelFromXP(totalXP) },
    streak: streak ? { current: streak.current, longest: streak.longest } : { current: 0, longest: 0 },
    subjects: subjectProgress,
    weakTopics,
    mistakesDue: mistakes.length,
    plan: plan?.items ?? [],
  });
}
