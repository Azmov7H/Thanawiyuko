import { NextResponse } from "next/server";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { ExamModel } from "@/server/modules/assessment/exam.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";

/** GET /api/exams — published mocks for the student's grade/track + attempts left. */
export async function GET() {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const { userId, profile } = s;
  const exams = await ExamModel.find({
    status: "published",
    grade: profile.grade ?? "sec3",
    $or: [{ track: null }, { track: profile.track }],
  })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  const out = await Promise.all(
    exams.map(async (e) => {
      const used = await AttemptModel.countDocuments({ examId: e._id, userId });
      const best = await AttemptModel.find({ examId: e._id, userId, status: "submitted" })
        .sort({ accuracy: -1 })
        .limit(1)
        .select("accuracy score total")
        .lean();
      const totalQ = e.blueprint.reduce((n: number, r: { count: number }) => n + r.count, 0);
      return {
        id: String(e._id),
        titleAr: e.titleAr,
        description: e.description,
        durationMin: e.durationMin,
        totalQ,
        attemptsAllowed: e.attemptsAllowed,
        attemptsLeft: Math.max(0, e.attemptsAllowed - used),
        best: best[0] ? { accuracy: best[0].accuracy, score: best[0].score, total: best[0].total } : null,
      };
    }),
  );
  return NextResponse.json({ exams: out });
}
