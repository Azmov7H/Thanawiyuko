import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { TopicModel } from "@/server/modules/academic/content.models";

/** GET /api/mistakes?filter=due|all — mistake library with hydrated question content. */
export async function GET(req: Request) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId } = s;

  const filter = new URL(req.url).searchParams.get("filter");
  const query: Record<string, unknown> = { studentId: userId, resolvedAt: null };
  if (filter !== "all") query.dueAt = { $lte: new Date() };

  const mistakes = await MistakeModel.find(query).sort({ dueAt: 1 }).limit(50).lean();
  const questionIds = mistakes.map((m) => m.questionId);
  const topicIds = [...new Set(mistakes.map((m) => String(m.topicId)))];

  const [questions, topics] = await Promise.all([
    questionIds.length
      ? QuestionModel.find({ _id: { $in: questionIds } })
          .select("stemMD options correctKeys explanationMD")
          .lean()
      : [],
    topicIds.length
      ? TopicModel.find({ _id: { $in: topicIds } }).select("titleAr").lean()
      : [],
  ]);
  const questionById = new Map(questions.map((q) => [String(q._id), q]));
  const titleByTopic = new Map(topics.map((t) => [String(t._id), t.titleAr]));

  return NextResponse.json({
    items: mistakes
      .map((m) => {
        const q = questionById.get(String(m.questionId));
        if (!q) return null;
        return {
          id: String(m._id),
          questionId: String(m.questionId),
          topicId: String(m.topicId),
          topicTitleAr: titleByTopic.get(String(m.topicId)) ?? null,
          conceptTag: m.conceptTag,
          stemMD: q.stemMD,
          options: q.options.map((o: { key: string; text: string }) => ({ key: o.key, text: o.text })),
          correctKeys: q.correctKeys,
          chosenKeys: m.chosenKeys,
          explanationMD: q.explanationMD,
          dueAt: m.dueAt,
          reviewCount: m.reviewCount,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  });
}
