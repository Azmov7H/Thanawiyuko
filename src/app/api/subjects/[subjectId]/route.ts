import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { studentOfSession, subjectTree } from "@/app/api/subjects/route";
import { SubjectModel } from "@/server/modules/academic/content.models";

/** GET /api/subjects/[subjectId] — published learning tree for practice picker. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  const { subjectId } = await params;
  if (!mongoose.isValidObjectId(subjectId))
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "معرف غير صالح." },
      { status: 400 },
    );
  try {
    await dbConnect();
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." },
      { status: 503 },
    );
  }
  const subject = await SubjectModel.findOne({ _id: subjectId, status: "published" }).lean();
  if (!subject)
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "المادة غير موجودة." },
      { status: 404 },
    );
  const units = await subjectTree(subjectId);
  return NextResponse.json({
    subject: { id: String(subject._id), code: subject.code, nameAr: subject.nameAr },
    units,
  });
}
