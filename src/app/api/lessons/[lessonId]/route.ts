import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { LessonModel, TopicModel, SubjectModel } from "@/server/modules/academic/content.models";

/** GET /api/lessons/[lessonId] — published lesson reader payload (§4.3). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  const { lessonId } = await params;
  if (!mongoose.isValidObjectId(lessonId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف غير صالح." }, { status: 400 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }

  const lesson = await LessonModel.findOne({ _id: lessonId, status: "published" }).lean();
  if (!lesson)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الدرس غير موجود." }, { status: 404 });

  const topic = await TopicModel.findById(lesson.topicId).select("titleAr subjectId").lean();
  const [subject, siblings] = await Promise.all([
    topic ? SubjectModel.findById(topic.subjectId).select("nameAr").lean() : null,
    LessonModel.find({ topicId: lesson.topicId, status: "published" })
      .select("titleAr order")
      .sort({ order: 1 })
      .lean(),
  ]);

  const index = siblings.findIndex((x) => String(x._id) === String(lesson._id));
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  return NextResponse.json({
    lesson: {
      id: String(lesson._id),
      titleAr: lesson.titleAr,
      bodyMD: lesson.bodyMD,
      diagrams: lesson.diagrams ?? [],
      videoUrl: lesson.videoUrl,
      readingMinutes: lesson.readingMinutes,
      order: lesson.order,
    },
    topic: topic ? { id: String(topic._id), titleAr: topic.titleAr } : null,
    subject: subject ? { id: String(subject._id), nameAr: subject.nameAr } : null,
    prev: prev ? { id: String(prev._id), titleAr: prev.titleAr } : null,
    next: next ? { id: String(next._id), titleAr: next.titleAr } : null,
  });
}
