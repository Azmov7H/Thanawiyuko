import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { AdminForbidden, canTransition, nextVersion, requireAdminUser } from "@/server/modules/admin/guard";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";
import {
  LessonModel,
  SubjectModel,
  TopicModel,
  UnitModel,
} from "@/server/modules/academic/content.models";
import { QuestionModel } from "@/server/modules/questions/question.model";

const MODELS = {
  subject: SubjectModel,
  unit: UnitModel,
  topic: TopicModel,
  lesson: LessonModel,
  question: QuestionModel,
} as const;

const listQuery = z.object({
  type: z.enum(["subject", "unit", "topic", "lesson", "question"]).default("question"),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const transitionBody = z.object({
  type: z.enum(["subject", "unit", "topic", "lesson", "question"]),
  id: z.string().min(1),
  action: z.enum(["transition"]),
  to: z.enum(["draft", "review", "published", "archived"]),
  reason: z.string().max(300).nullable().optional(),
  /** Field edits (lesson/question only) — any content change bumps version. */
  fields: z.record(z.string(), z.unknown()).optional(),
});

function err(code: string, messageAr: string, status: number) {
  return NextResponse.json({ code, messageAr }, { status });
}

/** GET /api/admin/content?type=&status=&page= — admin inventory (max 50/page). */
export async function GET(req: Request) {
  try {
    await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden)
      return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  const url = new URL(req.url);
  const parsed = listQuery.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) return err("VALIDATION", "استعلام غير صالح.", 400);

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }
  const Model = MODELS[parsed.data.type];
  const filter: Record<string, unknown> = {};
  if (parsed.data.status) filter.status = parsed.data.status;
  const limit = 50;
  const skip = (parsed.data.page - 1) * limit;
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page: parsed.data.page, limit });
}

/**
 * PATCH /api/admin/content — lifecycle transition and/or content edit.
 * Edits bump `version`; every mutation writes an AuditLog entry.
 */
export async function PATCH(req: Request) {
  let admin: { id: string };
  try {
    admin = await requireAdminUser();
  } catch (e) {
    if (e instanceof AdminForbidden)
      return err("FORBIDDEN", e.message, 403);
    return err("UNAUTHENTICATED", "سجّل الدخول أولًا.", 401);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("VALIDATION", "بيانات غير صالحة.", 400);
  }
  const parsed = transitionBody.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "راجع البيانات المدخلة.", 400);

  try {
    await dbConnect();
  } catch {
    return err("INTERNAL", "الخدمة غير متاحة حاليًا.", 503);
  }
  const Model = MODELS[parsed.data.type];
  const doc = await Model.findById(parsed.data.id);
  if (!doc) return err("NOT_FOUND", "العنصر غير موجود.", 404);

  const before = doc.toObject();
  const current = String(doc.get("status"));

  if (!canTransition(current, parsed.data.to)) {
    return NextResponse.json(
      {
        code: "CONFLICT",
        messageAr: `لا يمكن الانتقال من ${current} إلى ${parsed.data.to}.`,
      },
      { status: 409 },
    );
  }

  // Published questions require an explanation (M2 gate — defense in depth).
  if (
    parsed.data.type === "question" &&
    parsed.data.to === "published" &&
    !String(doc.get("explanationMD") ?? "").trim()
  ) {
    return err("VALIDATION", "لا يُنشر سؤال بدون شرح.", 422);
  }

  const editable = ["lesson", "question"].includes(parsed.data.type);
  const fields = parsed.data.fields ?? {};
  if (Object.keys(fields).length > 0 && !editable) {
    return err("VALIDATION", "تعديل الحقول متاح للدروس والأسئلة فقط.", 400);
  }
  // Never allow status/version/_id through field edits.
  for (const k of ["status", "version", "_id", "id", "createdAt"]) delete fields[k];

  // Explanation can never be emptied via edit.
  if (
    parsed.data.type === "question" &&
    "explanationMD" in fields &&
    !String(fields.explanationMD ?? "").trim()
  ) {
    return err("VALIDATION", "الشرح إجباري — لا يمكن تفريغه.", 422);
  }

  if (Object.keys(fields).length > 0) {
    doc.set(fields);
    doc.set("version", nextVersion(Number(doc.get("version") ?? 1)));
  }
  doc.set("status", parsed.data.to);
  await doc.save();

  await AuditLogModel.create({
    actorId: admin.id,
    action: `content.${parsed.data.to}`,
    entity: parsed.data.type,
    entityId: String(doc._id),
    before: { status: before.status, version: before.version },
    after: { status: doc.get("status"), version: doc.get("version"), fields: Object.keys(fields) },
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ item: doc.toObject() });
}
