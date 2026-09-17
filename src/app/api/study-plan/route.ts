import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { generatePlan } from "@/lib/planner";
import { cairoDayKey } from "@/lib/cairo";

export async function GET() {
  const s = await studentOfSession();
  if (!s) return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  const today = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: today }).lean();
  if (!plan) {
    // Auto-generate preview (not persisted until user accepts or regens with cap)
    const { TopicMasteryModel } = await import("@/server/modules/mastery/topic-mastery.model");
    const { MistakeModel } = await import("@/server/modules/mastery/mistake.model");
    const mastery = await TopicMasteryModel.find({ studentId: userId }).lean();
    const topics = await import("@/server/modules/academic/content.models").then((m) =>
      m.TopicModel.find({ _id: { $in: mastery.map((m) => m.topicId) } }).select("subjectId").lean(),
    );
    const mistakes = await MistakeModel.find({ studentId: userId, dueAt: { $lte: new Date() }, resolvedAt: null }).lean();
    const topicsMap = new Map(topics.map((t) => [String(t._id), { masteryScore: 0, band: "weak", n: 0, subjectId: "", examWeight: 1 }]));
    mastery.forEach((m) => {
      const topic = topics.find((t) => String(t._id) === String(m.topicId));
      if (topic) topicsMap.set(String(m.topicId), { masteryScore: m.masteryScore, band: m.band, n: m.n, subjectId: String(topic.subjectId), examWeight: 1 });
    });
    const due = mistakes.map((m) => ({ topicId: String(m.topicId), conceptTag: m.conceptTag }));
    const subjects = await import("@/server/modules/academic/content.models").then((m) =>
      m.SubjectModel.find().select("nameAr examWeight").lean(),
    );
    const items = generatePlan({
      targetExamDate: profile.targetExamDate ? new Date(profile.targetExamDate) : null,
      dailyMinutes: profile.dailyMinutes ?? 45,
      topics: topicsMap,
      mistakesDue: due,
      recentActivity: {},
      subjectWeights: new Map(subjects.map((s) => [String(s._id), s.examWeight ?? 1])),
    });
    plan = { items, date: today } as { items: typeof items; date: string };
  }
  return NextResponse.json({ plan: plan?.items ?? [], date: today });
}

export async function POST() {
  const s = await studentOfSession();
  if (!s) return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  const today = cairoDayKey();
  let plan = await StudyPlanModel.findOne({ studentId: userId, date: today });
  if (plan && plan.status === "active") {
    // Plus-gated regen (3/day); preview always allowed
    return NextResponse.json({ plan: plan.items, date: today, regensUsed: 0, canRegen: true });
  }
  // First-time generation
  const { TopicMasteryModel } = await import("@/server/modules/mastery/topic-mastery.model");
  const { MistakeModel } = await import("@/server/modules/mastery/mistake.model");
  const mastery = await TopicMasteryModel.find({ studentId: userId }).lean();
  const topics = await import("@/server/modules/academic/content.models").then((m) =>
    m.TopicModel.find({ _id: { $in: mastery.map((m) => m.topicId) } }).select("subjectId").lean(),
  );
  const mistakes = await MistakeModel.find({ studentId: userId, dueAt: { $lte: new Date() }, resolvedAt: null }).lean();
  const topicsMap = new Map(topics.map((t) => [String(t._id), { masteryScore: 0, band: "weak", n: 0, subjectId: "", examWeight: 1 }]));
  mastery.forEach((m) => {
    const topic = topics.find((t) => String(t._id) === String(m.topicId));
    if (topic) topicsMap.set(String(m.topicId), { masteryScore: m.masteryScore, band: m.band, n: m.n, subjectId: String(topic.subjectId), examWeight: 1 });
  });
  const due = mistakes.map((m) => ({ topicId: String(m.topicId), conceptTag: m.conceptTag }));
  const subjects = (await import("@/server/modules/academic/content.models")).SubjectModel.find()
    .select("nameAr examWeight")
    .lean() as unknown as Array<{ _id: string; nameAr: string; examWeight: number }>;
  const items = generatePlan({
    targetExamDate: profile.targetExamDate ? new Date(profile.targetExamDate) : null,
    dailyMinutes: profile.dailyMinutes ?? 45,
    topics: topicsMap,
    mistakesDue: due,
    recentActivity: {},
    subjectWeights: new Map(subjects.map((s) => [String(s._id), s.examWeight ?? 1])),
  });
  plan = await StudyPlanModel.create({ studentId: userId, date: today, items, status: "active" });
  return NextResponse.json({ plan: plan.items, date: today, created: true });
}