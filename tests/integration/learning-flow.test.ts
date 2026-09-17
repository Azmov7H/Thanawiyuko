import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/server/auth/config";
import { GET as getProgress } from "@/app/api/progress/route";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { UserAchievementModel, AchievementModel } from "@/server/modules/gamification/achievement.model";
import { recordAttemptOutcomes } from "@/server/modules/learning/service";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createUser, createProfile, createContent, seedAchievement } from "./helpers/seed";

const mockedAuth = auth as unknown as {
  mockResolvedValue: (value: { user: { id: string; role: string } } | null) => void;
};

const Q1 = new mongoose.Types.ObjectId();
const Q2 = new mongoose.Types.ObjectId();
const EXAM_ID = new mongoose.Types.ObjectId();

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

beforeEach(resetTestDb);

describe("learning loop (practice/exam submit → persisted outcomes → progress read)", () => {
  it("writes mastery, mistakes, XP, streak and achievements, and surfaces them in /api/progress", async () => {
    const user = await createUser({ email: "flow@test.dev" });
    const userId = String(user._id);
    const profile = await createProfile(userId);
    const content = await createContent();
    await seedAchievement("first_quiz");
    await seedAchievement("first_mock");

    const attempt = await AttemptModel.create({
      studentId: profile._id,
      userId: user._id,
      kind: "exam",
      clientAttemptId: "client-1",
      status: "submitted",
      shuffleSeed: 1,
      scope: { subjectId: content.subjectId, topicId: content.topicId },
      total: 2,
      score: 1,
      accuracy: 50,
      submittedAt: new Date(),
      examId: EXAM_ID,
      snapshots: [
        {
          qId: Q1,
          topicId: content.topicId,
          lessonId: content.lessonId,
          type: "mcq_single",
          stemMD: "سؤال ١",
          options: [
            { key: "A", text: "أ" },
            { key: "B", text: "ب" },
          ],
          correctKeys: ["A"],
          explanationMD: "شرح",
          difficulty: "hard",
          conceptTags: ["velocity"],
        },
        {
          qId: Q2,
          topicId: content.topicId,
          lessonId: content.lessonId,
          type: "mcq_single",
          stemMD: "سؤال ٢",
          options: [
            { key: "A", text: "أ" },
            { key: "B", text: "ب" },
          ],
          correctKeys: ["A"],
          explanationMD: "شرح",
          difficulty: "hard",
          conceptTags: ["velocity"],
        },
      ],
    });

    await recordAttemptOutcomes({
      userId,
      attemptId: String(attempt._id),
      kind: "exam",
      examId: String(EXAM_ID),
      answers: [
        { qId: String(Q1), correct: false, skipped: false, timeMs: 8000, chosenKeys: ["B"] },
        { qId: String(Q2), correct: true, skipped: false, timeMs: 8000, chosenKeys: ["A"] },
      ],
      snapshots: [
        {
          qId: String(Q1),
          topicId: content.topicId,
          difficulty: "hard",
          correctKeys: ["A"],
          conceptTags: ["velocity"],
        },
        {
          qId: String(Q2),
          topicId: content.topicId,
          difficulty: "hard",
          correctKeys: ["A"],
          conceptTags: ["velocity"],
        },
      ],
    });

    const mastery = await TopicMasteryModel.findOne({ studentId: userId, topicId: content.topicId }).lean();
    expect(mastery?.n).toBe(2);
    expect(mastery?.masteryScore).toBe(24);
    expect(mastery?.recent).toEqual([false, true]);

    const mistake = await MistakeModel.findOne({ studentId: userId, questionId: Q1, resolvedAt: null }).lean();
    expect(mistake).not.toBeNull();
    expect(mistake?.chosenKeys).toEqual(["B"]);
    expect(mistake?.correctKeys).toEqual(["A"]);

    const xpRows = await XPTransactionModel.find({ studentId: userId }).lean();
    expect(xpRows.reduce((sum, row) => sum + row.amount, 0)).toBe(42);
    expect(xpRows.map((row) => row.reason).sort()).toEqual(["effort", "exam_bonus", "quiz_correct"]);

    const streak = await StreakModel.findOne({ studentId: userId }).lean();
    expect(streak?.current).toBe(1);
    expect(streak?.longest).toBe(1);

    const unlocked = await UserAchievementModel.find({ studentId: userId }).lean();
    const codes = await AchievementModel.find({ _id: { $in: unlocked.map((u) => u.achievementId) } })
      .select("code")
      .lean();
    expect(codes.map((c) => c.code).sort()).toEqual(["first_mock", "first_quiz"]);

    mockedAuth.mockResolvedValue({ user: { id: userId, role: "student" } });
    const res = await getProgress();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      xp: { total: number; today: number };
      streak: { current: number };
      mistakesDue: number;
      subjects: Array<{ nameAr: string; mastery: number }>;
      readiness: unknown;
    };
    expect(body.xp.total).toBe(42);
    expect(body.xp.today).toBe(42);
    expect(body.streak.current).toBe(1);
    expect(body.subjects).toHaveLength(1);
    expect(body.subjects[0].nameAr).toBe("الفيزياء");
    expect(body.subjects[0].mastery).toBeGreaterThan(0);
    expect(body.readiness).toBeDefined();
    expect(body.mistakesDue).toBe(0);
  });
});
