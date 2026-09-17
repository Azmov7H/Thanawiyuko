import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import { ExamModel } from "@/server/modules/assessment/exam.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { shuffled } from "@/lib/random";
import { toPublic } from "@/server/modules/assessment/scoring";
import { getEntitlements } from "@/server/billing/entitlements";

function examInScope(exam: { grade: string; track: string | null }, profile: { grade: string | null; track: string | null }): boolean {
  if (profile.grade && exam.grade !== profile.grade) return false;
  if (exam.track && profile.track && exam.track !== profile.track) return false;
  return true;
}

/** GET /api/exams/[id] — briefing (no questions until start). */
export async function briefing(examId: string) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  if (!mongoose.isValidObjectId(examId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف غير صالح." }, { status: 400 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const exam = await ExamModel.findOne({ _id: examId, status: "published" }).lean();
  if (!exam || !examInScope(exam, s.profile))
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الامتحان غير موجود." }, { status: 404 });
  const ent = await getEntitlements(s.userId);
  const usedThisExam = await AttemptModel.countDocuments({ examId: exam._id, userId: s.userId });
  const usedTotal = ent.fullMockAccess ? usedThisExam : await AttemptModel.countDocuments({ userId: s.userId, kind: "exam" });
  const attemptsAllowed = ent.fullMockAccess ? exam.attemptsAllowed : ent.mockAttemptsAllowed;
  return NextResponse.json({
    exam: {
      id: String(exam._id),
      titleAr: exam.titleAr,
      description: exam.description,
      durationMin: exam.durationMin,
      totalQ: exam.blueprint.reduce((n: number, r: { count: number }) => n + r.count, 0),
      attemptsAllowed,
      attemptsLeft: Math.max(0, attemptsAllowed - usedTotal),
      plusRequired: !ent.fullMockAccess && usedTotal >= ent.mockAttemptsAllowed,
    },
  });
}

/** POST /api/exams/[id]/start — allocate shuffled set + server deadline. */
export async function startExam(examId: string, clientAttemptId?: string) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  if (!mongoose.isValidObjectId(examId))
    return NextResponse.json({ code: "VALIDATION", messageAr: "معرف غير صالح." }, { status: 400 });
  try {
    await dbConnect();
  } catch {
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  }
  const exam = await ExamModel.findOne({ _id: examId, status: "published" }).lean();
  if (!exam || !examInScope(exam, s.profile))
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الامتحان غير موجود." }, { status: 404 });

  const key = clientAttemptId ?? randomUUID();
  const existing = await AttemptModel.findOne({ userId: s.userId, clientAttemptId: key }).lean();
  if (existing) {
    return NextResponse.json({
      attemptId: String(existing._id),
      questions: toPublic(existing.snapshots),
      deadlineAt: existing.deadlineAt,
      resumed: true,
    });
  }

  const ent = await getEntitlements(s.userId);
  if (ent.fullMockAccess) {
    const used = await AttemptModel.countDocuments({ examId: exam._id, userId: s.userId });
    if (used >= exam.attemptsAllowed) {
      return NextResponse.json(
        { code: "EXAM_LIMIT", messageAr: "استنفدت محاولات هذا الامتحان." },
        { status: 403 },
      );
    }
  } else {
    const usedTotal = await AttemptModel.countDocuments({ userId: s.userId, kind: "exam" });
    if (usedTotal >= ent.mockAttemptsAllowed) {
      return NextResponse.json(
        { code: "PLUS_REQUIRED", messageAr: "الامتحان التجريبي الكامل متاح لمشتركي بلس. جرّب الامتحان المجاني أولًا." },
        { status: 403 },
      );
    }
  }

  // Resolve blueprint: sample per row, then shuffle globally per attempt.
  const seed = Math.floor(Math.random() * 2 ** 31);
  const picked: Array<{
    _id: mongoose.Types.ObjectId;
    topicId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId | null;
    type: "mcq_single" | "true_false";
    stemMD: string;
    options: Array<{ key: string; text: string }>;
    correctKeys: string[];
    explanationMD: string;
    difficulty: "easy" | "medium" | "hard";
    conceptTags: string[];
  }> = [];
  for (const row of exam.blueprint) {
    const pool = await QuestionModel.find({ topicId: row.topicId, status: "published" }).lean();
    if (pool.length < row.count) {
      return NextResponse.json(
        { code: "INTERNAL", messageAr: "عذرًا — الامتحان غير مكتمل حاليًا. جرّب لاحقًا." },
        { status: 503 },
      );
    }
    picked.push(...shuffled(pool, seed + picked.length).slice(0, row.count));
  }
  const ordered = shuffled(picked, seed);
  const snapshots = ordered.map((q, i) => ({
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
    conceptTags: q.conceptTags ?? [],
  }));

  const startedAt = new Date();
  const attempt = await AttemptModel.create({
    studentId: s.profile._id,
    userId: s.userId,
    kind: "exam",
    examId: exam._id,
    clientAttemptId: key,
    status: "in_progress",
    shuffleSeed: seed,
    scope: { subjectId: exam.subjectId ?? undefined },
    snapshots,
    answers: [],
    total: snapshots.length,
    startedAt,
    deadlineAt: new Date(startedAt.getTime() + exam.durationMin * 60_000),
  });

  return NextResponse.json(
    {
      attemptId: String(attempt._id),
      questions: toPublic(attempt.snapshots),
      total: attempt.total,
      deadlineAt: attempt.deadlineAt,
      durationMin: exam.durationMin,
    },
    { status: 201 },
  );
}
