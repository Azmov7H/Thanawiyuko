import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/server/db/client";
import { studentOfSession } from "@/app/api/subjects/route";
import {
  AttemptModel,
  type AttemptDoc,
  type AttemptAnswer,
  type QuestionSnapshot,
} from "@/server/modules/assessment/attempt.model";
import {
  analyzeAttempt,
  gradeAnswers,
  isPastDeadline,
  scoreOf,
  toPublic,
} from "@/server/modules/assessment/scoring";
import { TopicModel } from "@/server/modules/academic/content.models";
import { recordAttemptOutcomes } from "@/server/modules/learning/service";
import { logServerError } from "@/server/logger";

async function ownedExamAttempt(
  userId: string,
  attemptId: string,
): Promise<AttemptDoc | null | "DOWN"> {
  if (!mongoose.isValidObjectId(attemptId)) return null;
  try {
    await dbConnect();
  } catch {
    return "DOWN" as const;
  }
  return AttemptModel.findOne({ _id: attemptId, userId, kind: "exam" });
}

const saveSchema = z.object({
  answers: z
    .array(
      z.object({
        qId: z.string().min(1),
        chosenKeys: z.array(z.string()).max(6).default([]),
        timeMs: z.number().min(0).max(30 * 60 * 1000).default(0),
      }),
    )
    .max(100)
    .default([]),
  flaggedQIds: z.array(z.string()).max(100).default([]),
  tabSwitches: z.number().int().min(0).max(10000).optional(),
});

/**
 * PATCH /api/exams/attempt/[id] — autosave heartbeat (every ~20s + unload beacon).
 * Stores answers UNCHECKED (no feedback in exam mode) + flags + tab-switch count.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  const { attemptId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });

  const attempt = await ownedExamAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });
  if (attempt.status !== "in_progress")
    return NextResponse.json({ code: "CONFLICT", messageAr: "الجلسة مُسلّمة بالفعل." }, { status: 409 });

  const validIds = new Set(attempt.snapshots.map((x) => String(x.qId)));
  attempt.answers = parsed.data.answers
    .filter((a) => validIds.has(a.qId))
    .map((a) => ({
      qId: new mongoose.Types.ObjectId(a.qId),
      chosenKeys: a.chosenKeys,
      correct: false,
      skipped: a.chosenKeys.length === 0,
      checked: false,
      timeMs: a.timeMs,
    }));
  attempt.flaggedQIds = parsed.data.flaggedQIds.filter((id) => validIds.has(id));
  if (parsed.data.tabSwitches !== undefined) attempt.tabSwitches = parsed.data.tabSwitches;
  await attempt.save();
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

/**
 * POST /api/exams/attempt/[id]/submit — final scoring against the server deadline.
 * Late arrival (past deadline + grace) is still graded but flagged lateSubmit.
 */
export async function submitExam(
  _req: Request,
  attemptId: string,
  finalAnswers?: Array<{ qId: string; chosenKeys: string[]; timeMs: number }>,
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  const attempt = await ownedExamAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });

  if (attempt.status === "submitted") {
    return NextResponse.json({
      attemptId: String(attempt._id),
      score: attempt.score,
      total: attempt.total,
      accuracy: attempt.accuracy,
      resubmitted: true,
    });
  }

  // Merge autosaved answers with any final payload (final wins per question).
  const merged = new Map<string, { chosenKeys: string[]; timeMs: number }>();
  for (const a of attempt.answers) {
    merged.set(String(a.qId), { chosenKeys: a.chosenKeys, timeMs: a.timeMs });
  }
  for (const a of finalAnswers ?? []) merged.set(a.qId, { chosenKeys: a.chosenKeys, timeMs: a.timeMs });

  const graded = gradeAnswers(
    attempt.snapshots.map((x) => ({ qId: x.qId, type: x.type, correctKeys: x.correctKeys })),
    attempt.snapshots.map((x) => {
      const m = merged.get(String(x.qId));
      return { qId: String(x.qId), chosenKeys: m?.chosenKeys ?? [], timeMs: m?.timeMs ?? 0 };
    }),
  );

  const answers = graded.map((g) => ({
    qId: new mongoose.Types.ObjectId(g.qId),
    chosenKeys: g.chosenKeys,
    correct: g.correct,
    skipped: g.skipped,
    checked: true,
    timeMs: g.timeMs,
  }));
  const { score, accuracy } = scoreOf(graded);
  const lateSubmit =
    attempt.deadlineAt != null && isPastDeadline(attempt.deadlineAt.getTime(), Date.now());

  const updated = await AttemptModel.findOneAndUpdate(
    { _id: attempt._id, status: "in_progress" },
    { $set: { answers, score, accuracy, status: "submitted", submittedAt: new Date(), lateSubmit } },
    { new: true },
  ).lean();

  if (!updated) {
    const stored = await AttemptModel.findById(attempt._id).lean();
    return NextResponse.json({
      attemptId: String(attempt._id),
      score: stored?.score ?? 0,
      total: stored?.total ?? attempt.total,
      accuracy: stored?.accuracy ?? 0,
      resubmitted: true,
    });
  }

  try {
    await recordAttemptOutcomes({
      userId: String(s.userId),
      attemptId: String(updated._id),
      kind: updated.kind,
      examId: updated.examId ? String(updated.examId) : null,
      answers: updated.answers.map((a: AttemptAnswer) => ({
        qId: String(a.qId),
        correct: a.correct,
        skipped: a.skipped,
        timeMs: a.timeMs,
        chosenKeys: a.chosenKeys,
      })),
      snapshots: updated.snapshots.map((snap: QuestionSnapshot) => ({
        qId: String(snap.qId),
        topicId: String(snap.topicId),
        difficulty: snap.difficulty,
        correctKeys: snap.correctKeys,
        conceptTags: snap.conceptTags ?? [],
      })),
    });
  } catch (e) {
    await logServerError("learning.exam_outcome.failed", e, {
      route: "/api/exams/attempt/[attemptId]",
      attemptId: String(attempt._id),
    });
  }

  return NextResponse.json({
    attemptId: String(attempt._id),
    score,
    total: attempt.total,
    accuracy,
    lateSubmit,
  });
}

/** GET /api/exams/attempt/[id] — pre-submit state or post-submit review + analysis. */
export async function getExamAttempt(attemptId: string) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });

  const attempt = await ownedExamAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });

  const base: Record<string, unknown> = {
    attemptId: String(attempt._id),
    examId: attempt.examId ? String(attempt.examId) : null,
    status: attempt.status,
    questions: toPublic(attempt.snapshots),
    total: attempt.total,
    deadlineAt: attempt.deadlineAt,
    serverNow: new Date().toISOString(),
    flaggedQIds: attempt.flaggedQIds,
    answers: Object.fromEntries(
      attempt.answers.map((a) => [String(a.qId), { chosenKeys: a.chosenKeys }]),
    ),
  };

  if (attempt.status === "submitted") {
    const graded = attempt.answers.map((a) => ({
      qId: String(a.qId),
      chosenKeys: a.chosenKeys,
      correct: a.correct,
      skipped: a.skipped,
      timeMs: a.timeMs,
    }));
    const analysis = analyzeAttempt(
      attempt.snapshots.map((x) => ({ qId: x.qId, topicId: x.topicId, conceptTags: x.conceptTags ?? [] })),
      graded,
    );
    const topicIds = [...new Set(attempt.snapshots.map((x) => String(x.topicId)))];
    const topics = await TopicModel.find({ _id: { $in: topicIds } }).select("titleAr").lean();
    const titles = Object.fromEntries(topics.map((t) => [String(t._id), t.titleAr]));
    base.score = attempt.score;
    base.accuracy = attempt.accuracy;
    base.lateSubmit = attempt.lateSubmit;
    base.analysis = { ...analysis, topicTitles: titles };
    base.review = attempt.snapshots.map((snap) => {
      const a = graded.find((g) => g.qId === String(snap.qId));
      return {
        qId: String(snap.qId),
        topicId: String(snap.topicId),
        stemMD: snap.stemMD,
        options: snap.options,
        chosenKeys: a?.chosenKeys ?? [],
        correctKeys: snap.correctKeys,
        correct: a?.correct ?? false,
        skipped: a?.skipped ?? true,
        timeMs: a?.timeMs ?? 0,
        explanationMD: snap.explanationMD,
        difficulty: snap.difficulty,
        lessonId: snap.lessonId ? String(snap.lessonId) : null,
      };
    });
  }
  return NextResponse.json(base);
}
