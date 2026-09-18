import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createContent, createProfile, createUser } from "./helpers/seed";
import { ExamModel } from "@/server/modules/assessment/exam.model";
import { QuestionModel } from "@/server/modules/questions/question.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import {
  loadExamResultData,
  loadMistakeReportData,
  loadProgressReportData,
} from "@/server/modules/exports";

describe("exports data loaders", () => {
  let userId: string;
  let profileDoc: Awaited<ReturnType<typeof createProfile>>;
  let content: Awaited<ReturnType<typeof createContent>>;
  let examId: string;
  let attemptId: string;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    const user = await createUser({ email: `exports-${Date.now()}@test.dev` });
    userId = String(user._id);
    profileDoc = await createProfile(userId);
    content = await createContent();

    const exam = await ExamModel.create({
      titleAr: "امتحان تجريبي",
      grade: "sec3",
      track: "science",
      subjectId: content.subjectId,
      durationMin: 30,
      attemptsAllowed: 2,
      blueprint: [{ topicId: content.topicId, count: 1 }],
      status: "published",
    });
    examId = String(exam._id);

    const question = await QuestionModel.create({
      topicId: content.topicId,
      lessonId: content.lessonId,
      type: "mcq_single",
      stemMD: "ما مقدار القوة؟",
      options: [
        { key: "A", text: "صحيح" },
        { key: "B", text: "خطأ" },
      ],
      correctKeys: ["A"],
      explanationMD: "القوة تساوي الكتلة × العجلة.",
      difficulty: "medium",
      conceptTags: ["نيوتن"],
      status: "published",
    });

    const attempt = await AttemptModel.create({
      studentId: user._id,
      userId: user._id,
      kind: "exam",
      clientAttemptId: `export-exam-${Date.now()}`,
      shuffleSeed: 1,
      scope: {},
      status: "submitted",
      score: 0,
      total: 1,
      accuracy: 0,
      startedAt: new Date(),
      submittedAt: new Date(),
      examId: exam._id,
      deadlineAt: null,
      lateSubmit: false,
      flaggedQIds: [],
      tabSwitches: 0,
      snapshots: [
        {
          qId: question._id,
          topicId: content.topicId,
          lessonId: content.lessonId,
          type: "mcq_single",
          stemMD: "ما مقدار القوة؟",
          options: [
            { key: "A", text: "صحيح" },
            { key: "B", text: "خطأ" },
          ],
          correctKeys: ["A"],
          explanationMD: "القوة تساوي الكتلة × العجلة.",
          difficulty: "medium",
          conceptTags: ["نيوتن"],
        },
      ],
      answers: [
        {
          qId: question._id,
          chosenKeys: ["B"],
          correct: false,
          skipped: false,
          checked: true,
          timeMs: 4000,
        },
      ],
    });
    attemptId = String(attempt._id);

    await MistakeModel.create({
      studentId: user._id,
      topicId: content.topicId,
      questionId: question._id,
      conceptTag: "نيوتن",
      chosenKeys: ["B"],
      correctKeys: ["A"],
      dueAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      reviewCount: 0,
      consecutiveCorrect: 0,
      resolvedAt: null,
      lastReviewAt: null,
    });
  });

  it("loads progress report data from the snapshot", async () => {
    const data = await loadProgressReportData(userId, profileDoc as never);
    expect(data.studentName).toBe("طالب اختبار");
    expect(data.grade).toBe("الثالث الثانوي");
    expect(data.xp.total).toBe(0);
    expect(Array.isArray(data.plan)).toBe(true);
    expect(data.mistakesDue).toBe(1);
  });

  it("loads a submitted exam result with topic titles and review", async () => {
    const data = await loadExamResultData(userId, attemptId);
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data.examTitle).toBe("امتحان تجريبي");
    expect(data.total).toBe(1);
    expect(data.score).toBe(0);
    expect(data.topicTitles[content.topicId]).toBe("الحركة في خط مستقيم");
    expect(data.perTopic).toHaveLength(1);
    expect(data.review).toHaveLength(1);
    expect(data.review[0].correctKeys).toEqual(["A"]);
    expect(data.review[0].chosenKeys).toEqual(["B"]);
    expect(data.review[0].correct).toBe(false);
  });

  it("returns null for unknown or unsubmitted attempts", async () => {
    expect(await loadExamResultData(userId, new mongoose.Types.ObjectId().toString())).toBeNull();
    expect(await loadExamResultData(userId, "not-an-id")).toBeNull();

    const inProgress = await AttemptModel.create({
      studentId: userId,
      userId,
      kind: "exam",
      clientAttemptId: `export-exam-ip-${Date.now()}`,
      shuffleSeed: 2,
      scope: {},
      status: "in_progress",
      total: 1,
      startedAt: new Date(),
      submittedAt: null,
      examId: examId,
      deadlineAt: null,
      lateSubmit: false,
      flaggedQIds: [],
      tabSwitches: 0,
      snapshots: [],
      answers: [],
    });
    expect(await loadExamResultData(userId, String(inProgress._id))).toBeNull();
  });

  it("loads open mistakes with question and topic hydration", async () => {
    const data = await loadMistakeReportData(userId);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].topicTitleAr).toBe("الحركة في خط مستقيم");
    expect(data.items[0].stemMD).toBe("ما مقدار القوة؟");
    expect(data.items[0].conceptTag).toBe("نيوتن");
    expect(data.items[0].chosenKeys).toEqual(["B"]);
    expect(data.items[0].correctKeys).toEqual(["A"]);
    expect(data.items[0].reviewCount).toBe(0);
  });

  it("excludes resolved mistakes from the report", async () => {
    await MistakeModel.updateMany({}, { resolvedAt: new Date() });
    const data = await loadMistakeReportData(userId);
    expect(data.items).toHaveLength(0);
  });
});