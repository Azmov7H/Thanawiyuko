import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import {
  AdminForbidden,
  canTransition,
  nextVersion,
  requireAdminUser,
} from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { ExamModel } from "@/server/modules/assessment/exam.model";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { validateBlueprint } from "@/server/modules/assessment/scoring";

function forbidden(e: unknown) {
  if (e instanceof AdminForbidden)
    return NextResponse.json({ code: "FORBIDDEN", messageAr: e.message }, { status: 403 });
  return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
}

const patchSchema = z.object({
  /** Field edits (draft only) — bumps version. */
  fields: z
    .object({
      titleAr: z.string().trim().min(3).max(140).optional(),
      description: z.string().max(500).nullable().optional(),
      durationMin: z.number().int().min(5).max(240).optional(),
      attemptsAllowed: z.number().int().min(1).max(10).optional(),
      blueprint: z
        .array(
          z.object({
            topicId: z.string().refine((v) => mongoose.isValidObjectId(v)),
            count: z.number().int().min(1).max(100),
          }),
        )
        .min(1)
        .max(30)
        .optional(),
    })
    .optional(),
  /** Lifecycle move. Publish validates blueprint sufficiency. */
  to: z.enum(["draft", "review", "published", "archived"]).optional(),
  reason: z.string().max(300).nullable().optional(),
});

/** PATCH /api/admin/exams/[id] — edit (version bump) and/or lifecycle transition. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  let admin: { id: string };
  try {
    admin = await requireAdminUser();
  } catch (e) {
    return forbidden(e);
  }
  const { examId } = await params;
  if (!mongoose.isValidObjectId(examId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف غير صالح." }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "راجع البيانات." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const exam = await ExamModel.findById(examId);
  if (!exam)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الامتحان غير موجود." }, { status: 404 });

  const before = { status: exam.status, version: exam.version };
  const touched: string[] = [];

  if (parsed.data.fields && Object.keys(parsed.data.fields).length > 0) {
    if (exam.status !== "draft")
      return NextResponse.json(
        { code: "CONFLICT", messageAr: "التعديل متاح في المسودة فقط — أنشئ إصدارًا جديدًا." },
        { status: 409 },
      );
    exam.set(parsed.data.fields);
    exam.version = nextVersion(exam.version);
    touched.push(...Object.keys(parsed.data.fields));
  }

  if (parsed.data.to) {
    const from = String(exam.status);
    if (!canTransition(from, parsed.data.to))
      return NextResponse.json(
        { code: "CONFLICT", messageAr: `لا يمكن الانتقال من ${from} إلى ${parsed.data.to}.` },
        { status: 409 },
      );
    if (parsed.data.to === "published") {
      // Publish gate: blueprint rows must have enough published questions.
      const counts = await QuestionModel.aggregate([
        { $match: { status: "published", topicId: { $in: exam.blueprint.map((r: { topicId: mongoose.Types.ObjectId }) => r.topicId) } } },
        { $group: { _id: "$topicId", n: { $sum: 1 } } },
      ]);
      const available = new Map(counts.map((c: { _id: mongoose.Types.ObjectId; n: number }) => [String(c._id), c.n as number]));
      const deficits = validateBlueprint(
        exam.blueprint.map((r: { topicId: mongoose.Types.ObjectId; count: number }) => ({ topicId: String(r.topicId), count: r.count })),
        available,
      );
      if (deficits.length > 0)
        return NextResponse.json(
          { code: "VALIDATION", messageAr: "الأسئلة المنشورة لا تغطي المخطط.", details: deficits },
          { status: 422 },
        );
    }
    exam.status = parsed.data.to;
  }

  await exam.save();
  await AuditLogModel.create({
    actorId: admin.id,
    action: `exam.${parsed.data.to ?? "edit"}`,
    entity: "exam",
    entityId: String(exam._id),
    before,
    after: { status: exam.status, version: exam.version, fields: touched },
    reason: parsed.data.reason ?? null,
  });
  return NextResponse.json({ exam });
}
