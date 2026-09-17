import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { LessonModel, TopicModel } from "@/server/modules/academic/content.models";
import { StudySessionModel } from "@/server/modules/academic/study-session.model";
import { cairoDayKey } from "@/lib/cairo";

const completeSchema = z.object({
  minutes: z.number().int().min(0).max(240).default(0),
});

/** POST /api/lessons/[lessonId]/complete — log a StudySession; grants no mastery (§4.3). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  const { lessonId } = await params;
  if (!mongoose.isValidObjectId(lessonId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف غير صالح." }, { status: 400 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = completeSchema.safeParse(body ?? {});
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const lesson = await LessonModel.findOne({ _id: lessonId, status: "published" })
    .select("topicId")
    .lean();
  if (!lesson)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الدرس غير موجود." }, { status: 404 });

  const topic = await TopicModel.findById(lesson.topicId).select("subjectId").lean();
  if (!topic)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الموضوع غير موجود." }, { status: 404 });

  await StudySessionModel.findOneAndUpdate(
    { studentId: s.userId, lessonId, date: cairoDayKey() },
    {
      $max: { minutes: parsed.data.minutes },
      $set: { completedAt: new Date() },
      $setOnInsert: { topicId: lesson.topicId, subjectId: topic.subjectId },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
