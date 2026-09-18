import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { AttemptModel, type AttemptAnswer, type AttemptDoc, type QuestionSnapshot } from "@/server/modules/assessment/attempt.model";
import { ExamModel } from "@/server/modules/assessment/exam.model";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { TopicModel } from "@/server/modules/academic/content.models";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { getEntitlements } from "@/server/billing/entitlements";
import { getProgressSnapshot, type ProgressProfileInput } from "@/server/modules/progress/service";
import { analyzeAttempt } from "@/server/modules/assessment/scoring";
import { generatePdf, defaultPdfFilename, type GeneratedPdf } from "@/server/modules/pdf";
import {
  progressReportDoc,
  examResultDoc,
  mistakeReportDoc,
  type ProgressReportData,
  type ExamReportData,
  type MistakeReportData,
} from "./reports";

function gradeLabel(grade: string | undefined): string {
  const map: Record<string, string> = { sec1: "الأول الثانوي", sec2: "الثاني الثانوي", sec3: "الثالث الثانوي" };
  return map[grade ?? ""] ?? "—";
}

export async function loadProgressReportData(
  userId: string,
  profile: ProgressProfileInput & { grade?: string },
): Promise<ProgressReportData> {
  await dbConnect();
  const [user, snapshot] = await Promise.all([
    UserModel.findById(userId).select("name").lean(),
    getProgressSnapshot(userId, profile),
  ]);
  return {
    studentName: user?.name ?? "طالب",
    grade: gradeLabel(profile.grade),
    generatedAt: new Date(),
    xp: snapshot.xp,
    streak: snapshot.streak,
    subjects: snapshot.subjects,
    weakTopics: snapshot.weakTopics,
    readiness: snapshot.readiness,
    mistakesDue: snapshot.mistakesDue,
    plan: snapshot.plan,
  };
}

export async function loadExamResultData(userId: string, attemptId: string): Promise<ExamReportData | null> {
  if (!mongoose.isValidObjectId(attemptId)) return null;
  await dbConnect();
  const user = await UserModel.findById(userId).select("name").lean();
  const attempt: AttemptDoc | null = await AttemptModel.findOne({
    _id: attemptId,
    userId,
    kind: "exam",
  });
  if (!attempt) return null;
  if (attempt.status !== "submitted") return null;

  const graded = attempt.answers.map((a: AttemptAnswer) => ({
    qId: String(a.qId),
    chosenKeys: a.chosenKeys,
    correct: a.correct,
    skipped: a.skipped,
    timeMs: a.timeMs,
  }));
  const analysis = analyzeAttempt(
    attempt.snapshots.map((x: QuestionSnapshot) => ({
      qId: x.qId,
      topicId: x.topicId,
      conceptTags: x.conceptTags ?? [],
    })),
    graded,
  );
  const topicIds = [...new Set(attempt.snapshots.map((x: QuestionSnapshot) => String(x.topicId)))];
  const [topics, exam] = await Promise.all([
    TopicModel.find({ _id: { $in: topicIds } }).select("titleAr").lean(),
    attempt.examId ? ExamModel.findById(attempt.examId).select("titleAr").lean() : null,
  ]);
  const titles = Object.fromEntries(topics.map((t) => [String(t._id), t.titleAr]));

  return {
    studentName: user?.name ?? "طالب",
    examTitle: exam?.titleAr ?? null,
    generatedAt: new Date(),
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : new Date().toISOString(),
    score: attempt.score,
    total: attempt.total,
    accuracy: attempt.accuracy,
    lateSubmit: attempt.lateSubmit,
    perTopic: analysis.perTopic,
    topicTitles: titles,
    review: attempt.snapshots.map((snap: QuestionSnapshot) => {
      const a = graded.find((g) => g.qId === String(snap.qId));
      return {
        topicId: String(snap.topicId),
        stemMD: snap.stemMD,
        chosenKeys: a?.chosenKeys ?? [],
        correctKeys: snap.correctKeys,
        correct: a?.correct ?? false,
        skipped: a?.skipped ?? true,
        explanationMD: snap.explanationMD,
        difficulty: snap.difficulty,
      };
    }),
  };
}

export async function loadMistakeReportData(userId: string): Promise<MistakeReportData> {
  await dbConnect();
  const [user, ent] = await Promise.all([
    UserModel.findById(userId).select("name").lean(),
    getEntitlements(userId),
  ]);
  const mistakes = await MistakeModel.find({ studentId: userId, resolvedAt: null })
    .sort({ dueAt: 1 })
    .limit(ent.mistakesHistoryLimit)
    .lean();
  const questionIds = mistakes.map((m) => m.questionId);
  const topicIds = [...new Set(mistakes.map((m) => String(m.topicId)))];
  const [questions, topics] = await Promise.all([
    questionIds.length ? QuestionModel.find({ _id: { $in: questionIds } }).select("stemMD explanationMD").lean() : [],
    topicIds.length ? TopicModel.find({ _id: { $in: topicIds } }).select("titleAr").lean() : [],
  ]);
  const stemByQuestion = new Map(questions.map((q) => [String(q._id), q]));
  const titleByTopic = new Map(topics.map((t) => [String(t._id), t.titleAr]));

  return {
    studentName: user?.name ?? "طالب",
    generatedAt: new Date(),
    items: mistakes
      .map((m) => {
        const q = stemByQuestion.get(String(m.questionId));
        if (!q) return null;
        return {
          topicTitleAr: titleByTopic.get(String(m.topicId)) ?? null,
          conceptTag: m.conceptTag,
          stemMD: q.stemMD,
          chosenKeys: m.chosenKeys,
          correctKeys: m.correctKeys,
          explanationMD: q.explanationMD,
          dueAt: new Date(m.dueAt).toISOString(),
          reviewCount: m.reviewCount,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}

export async function generateProgressReportPdf(
  userId: string,
  profile: ProgressProfileInput & { grade?: string },
): Promise<GeneratedPdf> {
  const data = await loadProgressReportData(userId, profile);
  const doc = progressReportDoc(data);
  return generatePdf(doc, { filename: defaultPdfFilename(doc.title) });
}

export type ExamExportResult =
  | { ok: true; pdf: GeneratedPdf }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_SUBMITTED" };

export async function generateExamResultPdf(userId: string, attemptId: string): Promise<ExamExportResult> {
  const data = await loadExamResultData(userId, attemptId);
  if (data === null) {
    const attempt = mongoose.isValidObjectId(attemptId)
      ? await AttemptModel.findOne({ _id: attemptId, userId }).select("status").lean()
      : null;
    return { ok: false, code: attempt ? "NOT_SUBMITTED" : "NOT_FOUND" };
  }
  const doc = examResultDoc(data);
  return { ok: true, pdf: await generatePdf(doc, { filename: defaultPdfFilename(doc.title) }) };
}

export async function generateMistakeReportPdf(userId: string): Promise<GeneratedPdf> {
  const data = await loadMistakeReportData(userId);
  const doc = mistakeReportDoc(data);
  return generatePdf(doc, { filename: defaultPdfFilename(doc.title) });
}