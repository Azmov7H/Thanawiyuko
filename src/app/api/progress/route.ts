import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { computeMastery } from "@/lib/mastery";
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

  // Mastery
  const mastery = await TopicMasteryModel.find({ studentId: userId }).lean();

  // Mistakes due
  const today = cairoDayStartUTC();
  const mistakes = await MistakeModel.find({ studentId: userId, dueAt: { $lte: today }, resolvedAt: null }).lean();

  // Streak + XP
  const streak = await StreakModel.findOne({ studentId: userId }).lean();
  const xpAgg = await XPTransactionModel.aggregate([
    { $match: { studentId: userId } },
    { $group: { _id: null, total: { $sum: "$amount" }, today: { $sum: { $cond: [{ $gte: ["$createdAt", cairoDayStartUTC()]}, "$amount", 0] } } } },
  ]);
  const totalXP = xpAgg[0]?.total ?? 0;
  const todayXP = xpAgg[0]?.today ?? 0;

  // Subject-level aggregates
  const topics = await import("@/server/modules/academic/content.models").then((m) =>
    m.TopicModel.find({ _id: { $in: mastery.map((m) => m.topicId) } }).select("subjectId").lean(),
  );
  const topicSubj = Object.fromEntries(topics.map((t) => [String(t._id), String(t.subjectId)]));
  const subjAgg: Record<string, { total: number; sum: number }> = {};
  for (const m of mastery) {
    const sid = topicSubj[String(m.topicId)];
    if (!sid) continue;
    if (!subjAgg[sid]) subjAgg[sid] = { total: 0, sum: 0 };
    subjAgg[sid].total += 1;
    subjAgg[sid].sum += m.masteryScore;
  }
  const subjects = await import("@/server/modules/academic/content.models").then((m) =>
    m.SubjectModel.find({ _id: { $in: Object.keys(subjAgg) } }).select("nameAr examWeight").lean(),
  );
  const subjectProgress = subjects.map((s) => ({
    subjectId: String(s._id),
    nameAr: s.nameAr,
    mastery: subjAgg[String(s._id)]?.total ? Math.round(subjAgg[String(s._id)].sum / subjAgg[String(s._id)].total) : 0,
    topics: mastery.filter((m) => topicSubj[String(m.topicId)] === String(s._id)).length,
  }));

  // Today's plan
  const todayKey = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: todayKey }).lean();
  if (!plan) {
    const topicsMap = new Map(topics.map((t) => [String(t._id), { masteryScore: 0, band: "weak", n: 0, subjectId: "", examWeight: 1 }]));
    mastery.forEach((m) => {
      const topic = topics.find((t) => String(t._id) === String(m.topicId));
      if (topic) topicsMap.set(String(m.topicId), { masteryScore: m.masteryScore, band: m.band, n: m.n, subjectId: String(topic.subjectId), examWeight: 1 });
    });
    const due = mistakes.map((m) => ({ topicId: String(m.topicId), conceptTag: m.conceptTag }));
    const planItems = generatePlan({
      targetExamDate: profile.targetExamDate ? new Date(profile.targetExamDate) : null,
      dailyMinutes: profile.dailyMinutes ?? 45,
      topics: topicsMap,
      mistakesDue: due,
      recentActivity: {},
      subjectWeights: new Map(subjects.map((s) => [String(s._id), s.examWeight ?? 1])),
    });
    plan = { items: planItems, date: todayKey } as any;
  }

  return NextResponse.json({
    xp: { total: totalXP, today: todayXP, level: levelFromXP(totalXP) },
    streak: streak ? { current: streak.current, longest: streak.longest } : { current: 0, longest: 0 },
    subjects: subjectProgress,
    weakTopics: mastery
      .filter((m) => m.band === "weak" && m.n >= 5)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 5)
      .map((m) => ({ topicId: String(m.topicId), masteryScore: m.masteryScore, n: m.n })),
    mistakesDue: mistakes.length,
    plan: plan?.items ?? [],
  });
}