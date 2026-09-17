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
import { gradeAnswers, scoreOf, toPublic } from "@/server/modules/assessment/scoring";
import { recordAttemptOutcomes } from "@/server/modules/learning/service";

async function ownedAttempt(
  userId: string,
  attemptId: string,
): Promise<AttemptDoc | null | "DOWN"> {
  if (!mongoose.isValidObjectId(attemptId)) return null;
  try {
    await dbConnect();
  } catch {
    return "DOWN" as const;
  }
  return AttemptModel.findOne({ _id: attemptId, userId });
}

/** GET /api/practice/[id] — attempt state (status-aware: no answers pre-submit). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  const { attemptId } = await params;
  const attempt = await ownedAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });

  const answers = Object.fromEntries(
    attempt.answers.map((a) => [
      String(a.qId),
      { chosenKeys: a.chosenKeys, checked: a.checked, correct: attempt.status === "submitted" ? a.correct : undefined },
    ]),
  );
  const body: Record<string, unknown> = {
    attemptId: String(attempt._id),
    status: attempt.status,
    questions: toPublic(attempt.snapshots),
    answers,
    total: attempt.total,
  };
  if (attempt.status === "submitted") {
    body.score = attempt.score;
    body.accuracy = attempt.accuracy;
    body.review = attempt.snapshots.map((snap) => {
      const a = attempt.answers.find((x) => String(x.qId) === String(snap.qId));
      return {
        qId: String(snap.qId),
        stemMD: snap.stemMD,
        options: snap.options,
        chosenKeys: a?.chosenKeys ?? [],
        correctKeys: snap.correctKeys,
        correct: a?.correct ?? false,
        skipped: a?.skipped ?? true,
        explanationMD: snap.explanationMD,
        difficulty: snap.difficulty,
        lessonId: snap.lessonId ? String(snap.lessonId) : null,
      };
    });
  }
  return NextResponse.json(body);
}

const checkSchema = z.object({
  qId: z.string().min(1),
  chosenKeys: z.array(z.string()).max(6).default([]),
  timeMs: z.number().min(0).max(30 * 60 * 1000).default(0),
});

/**
 * POST /api/practice/[id]/check — instant per-question feedback (practice mode).
 * Locks the answer: a checked question cannot be changed, only reviewed.
 */
export async function checkAction(req: Request, attemptId: string) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION", messageAr: "بيانات غير صالحة." }, { status: 400 });
  }
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "إجابة غير صالحة." }, { status: 400 });

  const attempt = await ownedAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });
  if (attempt.status !== "in_progress")
    return NextResponse.json({ code: "CONFLICT", messageAr: "الجلسة مُسلّمة بالفعل." }, { status: 409 });
  if (attempt.kind !== "practice") {
    return NextResponse.json(
      { code: "FORBIDDEN", messageAr: "التحقق الفوري غير متاح في الامتحانات الموقوتة." },
      { status: 403 },
    );
  }

  const snap = attempt.snapshots.find((x) => String(x.qId) === parsed.data.qId);
  if (!snap)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "السؤال غير موجود في الجلسة." }, { status: 404 });

  const prior = attempt.answers.find((x) => String(x.qId) === parsed.data.qId);
  if (prior?.checked) {
    return NextResponse.json({
      correct: prior.correct,
      correctKeys: snap.correctKeys,
      explanationMD: snap.explanationMD,
      locked: true,
    });
  }

  const [graded] = gradeAnswers(
    [{ qId: snap.qId, type: snap.type, correctKeys: snap.correctKeys }],
    [{ qId: parsed.data.qId, chosenKeys: parsed.data.chosenKeys, timeMs: parsed.data.timeMs }],
  );
  if (prior) {
    prior.chosenKeys = graded.chosenKeys;
    prior.correct = graded.correct;
    prior.skipped = graded.skipped;
    prior.checked = true;
    prior.timeMs = graded.timeMs;
  } else {
    attempt.answers.push({
      qId: snap.qId,
      chosenKeys: graded.chosenKeys,
      correct: graded.correct,
      skipped: graded.skipped,
      checked: true,
      timeMs: graded.timeMs,
    });
  }
  await attempt.save();
  return NextResponse.json({
    correct: graded.correct,
    correctKeys: snap.correctKeys,
    explanationMD: snap.explanationMD,
    locked: true,
  });
}

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        qId: z.string().min(1),
        chosenKeys: z.array(z.string()).max(6).default([]),
        timeMs: z.number().min(0).max(30 * 60 * 1000).default(0),
      }),
    )
    .max(20)
    .default([]),
});

/**
 * POST /api/practice/[id]/submit — final scoring from snapshots (immutable history).
 * Checked answers stay locked; unchecked are graded from the payload (or skipped).
 */
export async function submitAction(req: Request, attemptId: string) {
  const s = await studentOfSession();
  if (!s)
    return NextResponse.json({ code: "UNAUTHENTICATED", messageAr: "سجّل الدخول أولًا." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ code: "VALIDATION", messageAr: "إجابات غير صالحة." }, { status: 400 });

  const attempt = await ownedAttempt(String(s.userId), attemptId);
  if (attempt === "DOWN")
    return NextResponse.json({ code: "INTERNAL", messageAr: "الخدمة غير متاحة حاليًا." }, { status: 503 });
  if (!attempt)
    return NextResponse.json({ code: "NOT_FOUND", messageAr: "الجلسة غير موجودة." }, { status: 404 });

  // Idempotent: resubmission returns the stored result.
  if (attempt.status === "submitted") {
    const { score, accuracy } = scoreOf(
      attempt.answers.map((a) => ({ qId: String(a.qId), chosenKeys: a.chosenKeys, correct: a.correct, skipped: a.skipped, timeMs: a.timeMs })),
    );
    return NextResponse.json({ attemptId: String(attempt._id), score, total: attempt.total, accuracy, resubmitted: true });
  }

  const payload = new Map(parsed.data.answers.map((a) => [a.qId, a]));
  const final = attempt.snapshots.map((snap) => {
    const id = String(snap.qId);
    const locked = attempt.answers.find((x) => String(x.qId) === id && x.checked);
    if (locked) {
      return { qId: id, chosenKeys: locked.chosenKeys, correct: locked.correct, skipped: locked.skipped, timeMs: locked.timeMs };
    }
    const p = payload.get(id);
    const [g] = gradeAnswers(
      [{ qId: snap.qId, type: snap.type, correctKeys: snap.correctKeys }],
      [{ qId: id, chosenKeys: p?.chosenKeys ?? [], timeMs: p?.timeMs ?? 0 }],
    );
    return g;
  });

  const answers = final.map((g) => ({
    qId: new mongoose.Types.ObjectId(g.qId),
    chosenKeys: g.chosenKeys,
    correct: g.correct,
    skipped: g.skipped,
    checked: true,
    timeMs: g.timeMs,
  }));
  const { score, accuracy } = scoreOf(final);

  const updated = await AttemptModel.findOneAndUpdate(
    { _id: attempt._id, status: "in_progress" },
    { $set: { answers, score, accuracy, status: "submitted", submittedAt: new Date() } },
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
    console.error("[Learning] practice outcome recording failed:", e);
  }

  return NextResponse.json({
    attemptId: String(attempt._id),
    score,
    total: attempt.total,
    accuracy,
    results: final.map((g) => {
      const snap = attempt.snapshots.find((x) => String(x.qId) === g.qId);
      return {
        ...g,
        correctKeys: snap?.correctKeys ?? [],
        explanationMD: snap?.explanationMD ?? "",
        difficulty: snap?.difficulty,
      };
    }),
  });
}
