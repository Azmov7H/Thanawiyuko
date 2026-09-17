import { dbConnect } from "@/server/db/client";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { AchievementModel, UserAchievementModel } from "@/server/modules/gamification/achievement.model";
import { cairoDayKey, cairoDayStartUTC } from "@/lib/cairo";
import { levelFromXP, xpForNextLevel } from "@/server/modules/gamification/xp.model";

const ACHIEVEMENT_RULES: Record<string, (ctx: EvalContext) => Promise<boolean>> = {
  first_quiz: async (ctx) => ctx.attemptsCount >= 1,
  streak_7: async (ctx) => ctx.streak.current >= 7,
  hundred_questions: async (ctx) => ctx.totalQuestions >= 100,
  first_mock: async (ctx) => ctx.examAttempts >= 1,
  mistake_hunter: async (ctx) => ctx.resolvedMistakes >= 10,
  physics_master: async (ctx) => ctx.anyTopicMastered("physics"),
  planner_follower: async (ctx) => ctx.planFollowDays >= 5,
  comeback_king: async (ctx) => ctx.comebackAfterBreak,
  accurate_20: async (ctx) => ctx.accurate20,
  exam_ready: async (ctx) => ctx.examReadiness >= 70,
};

interface EvalContext {
  studentId: string;
  attemptsCount: number;
  examAttempts: number;
  totalQuestions: number;
  resolvedMistakes: number;
  streak: { current: number; longest: number; lastActiveDay: string | null };
  anyTopicMastered: (subjectHint: string) => Promise<boolean>;
  planFollowDays: number;
  comebackAfterBreak: boolean;
  accurate20: boolean;
  examReadiness: number;
}

/** Evaluate all rules and unlock new achievements. */
export async function evaluateAchievements(studentId: string): Promise<string[]> {
  await dbConnect();

  const [attempts, mastery, mistakes, streak, exams] = await Promise.all([
    AttemptModel.find({ userId: studentId }).lean(),
    TopicMasteryModel.find({ studentId }).lean(),
    MistakeModel.find({ studentId, resolvedAt: { $ne: null } }).lean(),
    StreakModel.findOne({ studentId }).lean(),
    AttemptModel.find({ userId: studentId, kind: "exam", status: "submitted" }).lean(),
  ]);

  const totalQuestions = attempts.reduce((n, a) => n + a.total, 0);
  const attemptsCount = attempts.length;
  const examAttempts = exams.length;
  const resolvedMistakes = mistakes.length;

  const anyTopicMastered = async (subjectHint: string) => {
    const { TopicModel } = await import("@/server/modules/academic/content.models");
    const subjectIds = await getSubjectIdsForHint(subjectHint);
    const topics = await TopicModel.find({ subjectId: { $in: subjectIds } }).select("_id").lean();
    const ids = new Set(topics.map((t) => String(t._id)));
    return mastery.some((m) => ids.has(String(m.topicId)) && m.band === "mastered");
  };

  const ctx: EvalContext = {
    studentId,
    attemptsCount,
    examAttempts,
    totalQuestions,
    resolvedMistakes,
    streak: streak ? { current: streak.current, longest: streak.longest, lastActiveDay: streak.lastActiveDay } : { current: 0, longest: 0, lastActiveDay: null },
    anyTopicMastered,
    planFollowDays: 0, // TODO: track from study plan feedback
    comebackAfterBreak: false, // TODO: detect from streak history
    accurate20: false, // TODO: check last 20 accuracy
    examReadiness: 0, // TODO: compute from mastery
  };

  const existing = await UserAchievementModel.find({ studentId }).distinct("achievementId");
  const existingCodes = await AchievementModel.find({ _id: { $in: existing } }).distinct("code");
  const existingSet = new Set(existingCodes);

  const newlyUnlocked: string[] = [];
  for (const [code, fn] of Object.entries(ACHIEVEMENT_RULES)) {
    if (existingSet.has(code)) continue;
    if (await fn(ctx)) {
      const ach = await AchievementModel.findOne({ code }).lean();
      if (ach) {
        await UserAchievementModel.create({ studentId, achievementId: ach._id });
        newlyUnlocked.push(code);
      }
    }
  }
  return newlyUnlocked;
}

async function getSubjectIdsForHint(hint: string): Promise<string[]> {
  const map: Record<string, string[]> = {
    physics: ["phy-sec3"],
    math: ["pure-sec3", "applied-sec3"],
  };
  const codes = map[hint] ?? [];
  const subjects = await import("@/server/modules/academic/content.models").then((m) =>
    m.SubjectModel.find({ code: { $in: codes } }).select("_id").lean(),
  );
  return subjects.map((s) => String(s._id));
}

/** XP transaction helper — respects daily cap & anti-farm (server authority). */
export async function awardXp(studentId: string, amount: number, reason: string, refId: string): Promise<{ xp: number; level: number }> {
  await dbConnect();
  const today = cairoDayStartUTC();
  const todayXpAgg = await XPTransactionModel.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), createdAt: { $gte: today } } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]);
  const usedToday = todayXpAgg[0]?.sum ?? 0;
  const cap = 600;
  if (usedToday >= cap) return { xp: 0, level: 0 };

  const actual = Math.min(amount, cap - usedToday);
  if (actual <= 0) return { xp: 0, level: 0 };

  const last = await XPTransactionModel.findOne({ studentId }).sort({ createdAt: -1 }).lean();
  const balanceAfter = (last?.balanceAfter ?? 0) + actual;
  await XPTransactionModel.create({
    studentId: new mongoose.Types.ObjectId(studentId),
    amount: actual,
    reason,
    refId,
    balanceAfter,
  });

  const newTotal = balanceAfter;
  return { xp: actual, level: levelFromXP(newTotal) };
}

/** Streak reconciliation (daily job) — call from cron. */
export async function reconcileStreaks(): Promise<void> {
  await dbConnect();
  const today = cairoDayKey();
  const yesterday = cairoDayKey(new Date(Date.now() - 24 * 3600 * 1000));
  const profiles = await StudentProfileModel.find().select("_id").lean();
  for (const p of profiles) {
    const streakDoc = await StreakModel.findOne({ studentId: p._id });
    if (!streakDoc) continue;
    const last = streakDoc.lastActiveDay;
    if (!last) continue;
    if (last === today) continue;
    if (last === yesterday) continue; // already active
    // broke streak
    streakDoc.current = 0;
    streakDoc.lastActiveDay = null;
    await streakDoc.save();
  }
}

/** Weekly leaderboard build (job) — opt-in only. */
export async function buildWeeklyLeaderboard(weekStart: Date): Promise<void> {
  await dbConnect();
  // TODO: filter by opt-in flag on profile
  const entries = await XPTransactionModel.aggregate([
    { $match: { createdAt: { $gte: weekStart, $lt: new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000) } } },
    { $group: { _id: "$studentId", xp: { $sum: "$amount" } } },
    { $sort: { xp: -1 } },
    { $limit: 100 },
  ]);
  const nicknameMap = await StudentProfileModel.find({ _id: { $in: entries.map((e) => e._id) } }).select("nickname").lean();
  const nick = Object.fromEntries(nicknameMap.map((s) => [String(s._id), s.nickname ?? "طالب"]));
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    await import("@/server/modules/gamification/achievement.model").then((m) =>
      m.LeaderboardEntryModel.findOneAndUpdate(
        { studentId: e._id, weekStart },
        { $set: { xp: e.xp, rank: i + 1, nickname: nick[String(e._id)] ?? "طالب" } },
        { upsert: true },
      ),
    );
  }
}

import mongoose from "mongoose";