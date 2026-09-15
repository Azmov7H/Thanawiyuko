import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { toPublic } from "@/server/modules/assessment/scoring";
import { shuffled } from "@/lib/random";
import { cairoDayStartUTC } from "@/lib/cairo";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { TopicModel } from "@/server/modules/academic/content.models";

const startSchema = z
  .object({
    subjectId: z.string().optional(),
    topicId: z.string().optional(),
    count: z.number().int().min(3).max(20).default(10),
    clientAttemptId: z.string().min(8).max(80).optional(),
  })
  .refine((v) => Boolean(v.subjectId) !== Boolean(v.topicId), {
    message: "حدد مادة أو موضوعًا واحدًا.",
  });

export function dailyLimit(): number {
  const n = Number(process.env.PRACTICE_DAILY_LIMIT ?? 30);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

/** POST /api/practice/start — sample questions, snapshot, create attempt. */
export async function POST(req: Request) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json(
      { code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "بيانات غير صالحة." },
      { status: 400 },
    );
  }
  const parsed = startSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { code: "VALIDATION", messageAr: "حدد مادة أو موضوعًا وعدد أسئلة (3–20)." },
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

  const { userId, profile } = s;
  const clientAttemptId = parsed.data.clientAttemptId ?? randomUUID();

  // Idempotent retry: same client key returns the existing attempt.
  const existing = await AttemptModel.findOne({ userId, clientAttemptId }).lean();
  if (existing) {
    return NextResponse.json({
      attemptId: String(existing._id),
      questions: toPublic(existing.snapshots),
      total: existing.total,
      resumed: true,
    });
  }

  // Daily practice budget (§4.5 anti-farm + §3 free tier).
  const dayStart = cairoDayStartUTC();
  const todays = await AttemptModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), startedAt: { $gte: dayStart } } },
    { $group: { _id: null, n: { $sum: "$total" } } },
  ]);
  const used = todays[0]?.n ?? 0;
  const limit = dailyLimit();
  if (used + parsed.data.count > limit) {
    return NextResponse.json(
      {
        code: "PRACTICE_LIMIT",
        messageAr: `وصلت لحد التدريب اليومي (${limit} سؤال). ارجع بكرة بخطة جديدة.`,
        used,
        limit,
      },
      { status: 403 },
    );
  }

  // Resolve scope → published questions.
  const qFilter: Record<string, unknown> = { status: "published" };
  if (parsed.data.topicId) {
    if (!mongoose.isValidObjectId(parsed.data.topicId))
      return NextResponse.json({ code: "VALIDATION", messageAr: "موضوع غير صالح." }, { status: 400 });
    const topic = await TopicModel.findOne({ _id: parsed.data.topicId, status: "published" }).lean();
    if (!topic)
      return NextResponse.json({ code: "NOT_FOUND", messageAr: "الموضوع غير موجود." }, { status: 404 });
    qFilter.topicId = topic._id;
  } else {
    const topics = await TopicModel.find({ subjectId: parsed.data.subjectId, status: "published" })
      .select("_id")
      .lean();
    if (topics.length === 0)
      return NextResponse.json({ code: "NOT_FOUND", messageAr: "لا محتوى منشور لهذه المادة بعد." }, { status: 404 });
    qFilter.topicId = { $in: topics.map((t) => t._id) };
  }
  const pool = await QuestionModel.find(qFilter).lean();
  if (pool.length < 3) {
    return NextResponse.json(
      { code: "NOT_FOUND", messageAr: "لا توجد أسئلة كافية هنا بعد — جرّب موضوعًا آخر." },
      { status: 404 },
    );
  }

  const seed = Math.floor(Math.random() * 2 ** 31);
  const picked = shuffled(pool, seed).slice(0, Math.min(parsed.data.count, pool.length));
  const snapshots = picked.map((q, i) => ({
    qId: q._id,
    topicId: q.topicId,
    lessonId: q.lessonId ?? null,
    type: q.type,
    stemMD: q.stemMD,
    options: shuffled(
      q.options.map((o: { key: string; text: string }) => ({ key: o.key, text: o.text })),
      seed + i + 1,
    ),
    correctKeys: q.correctKeys,
    explanationMD: q.explanationMD,
    difficulty: q.difficulty,
  }));

  const attempt = await AttemptModel.create({
    studentId: profile._id,
    userId,
    kind: "practice",
    clientAttemptId,
    status: "in_progress",
    shuffleSeed: seed,
    scope: {
      subjectId: parsed.data.subjectId ?? undefined,
      topicId: parsed.data.topicId ?? undefined,
    },
    snapshots,
    answers: [],
    total: snapshots.length,
  });

  return NextResponse.json(
    {
      attemptId: String(attempt._id),
      questions: toPublic(attempt.snapshots),
      total: attempt.total,
      remaining: limit - used - attempt.total,
    },
    { status: 201 },
  );
}
