import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { TopicModel, SubjectModel } from "@/server/modules/academic/content.models";
import { generatePlan } from "@/lib/planner";
import { cairoDayKey, cairoDayStartUTC } from "@/lib/cairo";
import { levelFromXP } from "@/server/modules/gamification/xp.model";

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

  const mastery = await TopicMasteryModel.find({ studentId: userId }).lean();

  const today = cairoDayStartUTC();
  const mistakes = await MistakeModel.find({ studentId: userId, dueAt: { $lte: today }, resolvedAt: null }).lean();

  const streak = await StreakModel.findOne({ studentId: userId }).lean();
  const xpAgg = await XPTransactionModel.aggregate([
    { $match: { studentId: userId } },
    { $group: { _id: null, total: { $sum: "$amount" }, today: { $sum: { $cond: [{ $gte: ["$createdAt", cairoDayStartUTC()] }, "$amount", 0] } } } },
  ]);
  const totalXP = xpAgg[0]?.total ?? 0;
  const todayXP = xpAgg[0]?.today ?? 0;

  const topicIds = [...new Set(mastery.filter((m) => m.topicId).map((m) => String(m.topicId)))];
  const topics = topicIds.length
    ? await TopicModel.find({ _id: { $in: topicIds } }).select("subjectId").lean()
    : [];
  const subjOfTopic = new Map(topics.map((t) => [String(t._id), String(t.subjectId)]));

  const subjAgg = new Map<string, { total: number; sum: number }>();
  const weakTopics: Array<{ topicId: string; masteryScore: number; n: number }> = [];
  const topicsMap = new Map<string, { masteryScore: number; band: string; n: number; subjectId: string; examWeight: number }>();

  for (const m of mastery) {
    const sid = m.topicId ? subjOfTopic.get(String(m.topicId)) : undefined;
    if (!sid) continue;
    const agg = subjAgg.get(sid) ?? { total: 0, sum: 0 };
    agg.total += 1;
    agg.sum += m.masteryScore;
    subjAgg.set(sid, agg);
    topicsMap.set(String(m.topicId), { masteryScore: m.masteryScore, band: m.band, n: m.n, subjectId: sid, examWeight: 1 });
    if (m.band === "weak" && m.n >= 5) {
      weakTopics.push({ topicId: String(m.topicId), masteryScore: m.masteryScore, n: m.n });
    }
  }

  const subjects = [...subjAgg.keys()].length
    ? await SubjectModel.find({ _id: { $in: [...subjAgg.keys()] } }).select("nameAr examWeight").lean()
    : [];
  const subjectProgress = subjects.map((sbj) => {
    const agg = subjAgg.get(String(sbj._id));
    return {
      subjectId: String(sbj._id),
      nameAr: sbj.nameAr,
      mastery: agg?.total ? Math.round(agg.sum / agg.total) : 0,
      topics: agg?.total ?? 0,
    };
  });

  const todayKey = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: todayKey }).lean();
  if (!plan) {
    const due = mistakes.map((m) => ({ topicId: String(m.topicId), conceptTag: m.conceptTag }));
    const planItems = generatePlan({
      targetExamDate: profile.targetExamDate ? new Date(profile.targetExamDate) : null,
      dailyMinutes: profile.dailyMinutes ?? 45,
      topics: topicsMap,
      mistakesDue: due,
      recentActivity: {},
      subjectWeights: new Map(subjects.map((s) => [String(s._id), s.examWeight ?? 1])),
    });
    plan = { items: planItems, date: todayKey } as { items: typeof planItems; date: string };
  }

  weakTopics.sort((a, b) => a.masteryScore - b.masteryScore);

  return NextResponse.json({
    xp: { total: totalXP, today: todayXP, level: levelFromXP(totalXP) },
    streak: streak ? { current: streak.current, longest: streak.longest } : { current: 0, longest: 0 },
    subjects: subjectProgress,
    weakTopics: weakTopics.slice(0, 5),
    mistakesDue: mistakes.length,
    plan: plan?.items ?? [],
  });
}