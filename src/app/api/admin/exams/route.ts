import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { AdminForbidden, requireAdminUser } from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import { ExamModel } from "@/server/modules/assessment/exam.model";

function forbidden(e: unknown) {
  if (e instanceof AdminForbidden)
    return NextResponse.json({ code: "FORBIDDEN", messageAr: e.message }, { status: 403 });
  return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
}

const blueprintRow = z.object({
  topicId: z.string().refine((v) => mongoose.isValidObjectId(v), "موضوع غير صالح"),
  count: z.number().int().min(1).max(100),
});

const createSchema = z.object({
  titleAr: z.string().trim().min(3).max(140),
  description: z.string().max(500).nullable().optional(),
  grade: z.enum(["sec1", "sec2", "sec3"]).default("sec3"),
  track: z.enum(["general", "science", "math", "literary"]).nullable().optional(),
  subjectId: z.string().nullable().optional(),
  durationMin: z.number().int().min(5).max(240),
  attemptsAllowed: z.number().int().min(1).max(10).default(2),
  blueprint: z.array(blueprintRow).min(1).max(30),
});

/** GET /api/admin/exams — list all (any status) for the builder. */
export async function GET() {
  try {
    await requireAdminUser();
  } catch (e) {
    return forbidden(e);
  }
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const exams = await ExamModel.find().sort({ updatedAt: -1 }).limit(50).lean();
  return NextResponse.json({ exams });
}

/** POST /api/admin/exams — create a draft exam with a question blueprint. */
export async function POST(req: Request) {
  let admin: { id: string };
  try {
    admin = await requireAdminUser();
  } catch (e) {
    return forbidden(e);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "راجع بيانات الامتحان." }, { status: 400 });
  if (parsed.data.subjectId && !mongoose.isValidObjectId(parsed.data.subjectId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "مادة غير صالحة." }, { status: 400 });

  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const exam = await ExamModel.create({
    titleAr: parsed.data.titleAr,
    description: parsed.data.description ?? null,
    grade: parsed.data.grade,
    track: parsed.data.track ?? null,
    subjectId: parsed.data.subjectId ?? null,
    durationMin: parsed.data.durationMin,
    attemptsAllowed: parsed.data.attemptsAllowed,
    blueprint: parsed.data.blueprint.map((r) => ({ topicId: r.topicId, count: r.count })),
    status: "draft",
  });
  await AuditLogModel.create({
    actorId: admin.id,
    action: "exam.create",
    entity: "exam",
    entityId: String(exam._id),
    before: null,
    after: { titleAr: exam.titleAr, rows: exam.blueprint.length },
  });
  return NextResponse.json({ exam }, { status: 201 });
}
