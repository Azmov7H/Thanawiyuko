import { NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { dbConnect } from "@/server/db/client";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { SubjectModel, TopicModel, UnitModel, LessonModel } from "@/server/modules/academic/content.models";
import { QuestionModel } from "@/server/modules/questions/question.model";

function unauth() {
  return NextResponse.json(
    { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
    { status: 401 },
  );
}

/** Resolve the student profile for the session user. */
export async function studentOfSession() {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = (session?.user as { id?: string } | undefined)?.id;
  } catch {
    return null;
  }
  if (!userId) return null;
  try {
    await dbConnect();
  } catch {
    return null;
  }
  const profile = await StudentProfileModel.findOne({ userId }).lean();
  if (!profile) return null;
  return { userId, profile };
}

/** GET /api/subjects — published subjects for the student's grade/track. */
export async function GET() {
  const s = await studentOfSession();
  if (!s) return unauth();
  const { profile } = s;
  const filter: Record<string, unknown> = { status: "published", grade: profile.grade ?? "sec3" };
  const subjects = await SubjectModel.find(filter).sort({ examWeight: -1 }).lean();
  const mine = subjects.filter(
    (x) => !profile.track || x.tracks.length === 0 || x.tracks.includes(String(profile.track)),
  );
  return NextResponse.json({
    subjects: mine.map((x) => ({
      id: String(x._id),
      code: x.code,
      nameAr: x.nameAr,
      examWeight: x.examWeight,
    })),
  });
}

/** GET /api/subjects/[subjectId] — published units→topics tree with question counts. */
export async function subjectTree(subjectId: string) {
  const units = await UnitModel.find({ subjectId, status: "published" }).sort({ order: 1 }).lean();
  const tree = [];
  for (const u of units) {
    const topics = await TopicModel
      .find({ unitId: u._id, status: "published" })
      .sort({ order: 1 })
      .lean();
    const withCounts = await Promise.all(
      topics.map(async (t) => ({
        id: String(t._id),
        titleAr: t.titleAr,
        conceptTags: t.conceptTags,
        questionCount: await QuestionModel.countDocuments({ topicId: t._id, status: "published" }),
        lessons: (
          await LessonModel.find({ topicId: t._id, status: "published" })
            .select("titleAr readingMinutes order")
            .sort({ order: 1 })
            .lean()
        ).map((l) => ({
          id: String(l._id),
          titleAr: l.titleAr,
          readingMinutes: l.readingMinutes,
        })),
      })),
    );
    tree.push({ id: String(u._id), titleAr: u.titleAr, topics: withCounts });
  }
  return tree;
}
