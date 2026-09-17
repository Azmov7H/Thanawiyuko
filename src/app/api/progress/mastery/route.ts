import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";

/** GET /api/progress/mastery — topic mastery for the student (with topic titles). */
export async function GET() {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId } = s;

  const docs = await TopicMasteryModel.find({ studentId: userId }).lean();
  if (docs.length === 0) return NextResponse.json({ mastery: [] });

  const topicIds = [...new Set(docs.map((d) => String(d.topicId)))];
  const topics = await import("@/server/modules/academic/content.models").then((m) =>
    m.TopicModel.find({ _id: { $in: topicIds } }).select("titleAr subjectId").lean(),
  );
  const titles = Object.fromEntries(topics.map((t) => [String(t._id), { title: t.titleAr, subjectId: String(t.subjectId) }]));

  return NextResponse.json({
    mastery: docs.map((d) => ({
      topicId: String(d.topicId),
      title: titles[String(d.topicId)]?.title ?? "موضوع",
      subjectId: titles[String(d.topicId)]?.subjectId ?? null,
      masteryScore: d.masteryScore,
      band: d.band,
      n: d.n,
      last10Accuracy: d.last10Accuracy,
      updatedAt: d.updatedAt,
    })),
  });
}