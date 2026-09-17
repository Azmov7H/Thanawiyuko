import mongoose from "mongoose";
import { dbConnect } from "@/server/db/client";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { MistakeModel, nextDueAt } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { awardXp, evaluateAchievements } from "@/server/modules/gamification/service";
import { computeMastery } from "@/lib/mastery";
import { answerXp, isStreakQualifying, EXAM_BONUS_XP } from "@/lib/learning";
import { cairoDayKey } from "@/lib/cairo";

const MASTERY_WINDOW = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export type OutcomeAnswer = {
  qId: string;
  correct: boolean;
  skipped: boolean;
  timeMs: number;
  chosenKeys: string[];
};

export type OutcomeSnapshot = {
  qId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  correctKeys: string[];
  conceptTags?: string[];
};

export type AttemptOutcomeInput = {
  userId: string;
  attemptId: string;
  kind: string;
  examId: string | null;
  answers: OutcomeAnswer[];
  snapshots: OutcomeSnapshot[];
};

async function updateMastery(userId: string, answers: OutcomeAnswer[], snapshots: OutcomeSnapshot[]) {
  const snapById = new Map(snapshots.map((s) => [s.qId, s]));
  const byTopic = new Map<string, boolean[]>();

  for (const a of answers) {
    const snap = snapById.get(a.qId);
    if (!snap) continue;
    const list = byTopic.get(snap.topicId) ?? [];
    list.push(a.correct);
    byTopic.set(snap.topicId, list);
  }

  for (const [topicId, results] of byTopic) {
    const existing = await TopicMasteryModel.findOne({ studentId: userId, topicId }).lean();
    const combined = [...results, ...(existing?.recent ?? [])].slice(0, MASTERY_WINDOW);
    const mastery = computeMastery({ answers: combined.map((correct) => ({ correct })) });
    await TopicMasteryModel.findOneAndUpdate(
      { studentId: userId, topicId },
      {
        $set: {
          masteryScore: mastery.masteryScore,
          band: mastery.band,
          n: mastery.n,
          last10Accuracy: mastery.last10Accuracy,
          recent: combined,
        },
      },
      { upsert: true, new: true },
    );
  }
}

async function updateMistakes(userId: string, answers: OutcomeAnswer[], snapshots: OutcomeSnapshot[]) {
  const snapById = new Map(snapshots.map((s) => [s.qId, s]));
  const now = new Date();

  for (const a of answers) {
    const snap = snapById.get(a.qId);
    if (!snap) continue;
    const conceptTag = snap.conceptTags?.[0] ?? null;

    if (!a.correct) {
      const existing = await MistakeModel.findOne({ studentId: userId, questionId: a.qId, resolvedAt: null });
      if (existing) {
        existing.reviewCount += 1;
        existing.chosenKeys = a.chosenKeys;
        existing.correctKeys = snap.correctKeys;
        existing.conceptTag = conceptTag;
        existing.lastReviewAt = now;
        existing.dueAt = nextDueAt(existing.reviewCount);
        await existing.save();
      } else {
        await MistakeModel.create({
          studentId: userId,
          topicId: snap.topicId,
          questionId: a.qId,
          conceptTag,
          chosenKeys: a.chosenKeys,
          correctKeys: snap.correctKeys,
          dueAt: nextDueAt(0),
          reviewCount: 0,
          consecutiveCorrect: 0,
          lastReviewAt: now,
        });
      }
      continue;
    }

    const mistake = await MistakeModel.findOne({ studentId: userId, questionId: a.qId, resolvedAt: null });
    if (!mistake) continue;
    mistake.reviewCount += 1;
    mistake.consecutiveCorrect += 1;
    mistake.lastReviewAt = now;
    if (mistake.consecutiveCorrect >= 2) mistake.resolvedAt = now;
    else mistake.dueAt = nextDueAt(mistake.reviewCount);
    await mistake.save();
  }
}

async function updateXp(input: AttemptOutcomeInput) {
  const { userId, attemptId, kind, examId, answers, snapshots } = input;
  const snapById = new Map(snapshots.map((s) => [s.qId, s]));
  const now = Date.now();

  const priorAttempts = (await AttemptModel.find({
    userId,
    status: "submitted",
    _id: { $ne: new mongoose.Types.ObjectId(attemptId) },
  })
    .select("submittedAt snapshots.qId")
    .lean()) as unknown as Array<{ submittedAt: Date | null; snapshots: Array<{ qId: mongoose.Types.ObjectId }> }>;

  const lastSeen = new Map<string, number>();
  for (const prior of priorAttempts) {
    const at = prior.submittedAt ? new Date(prior.submittedAt).getTime() : 0;
    for (const snap of prior.snapshots) {
      const id = String(snap.qId);
      if ((lastSeen.get(id) ?? 0) < at) lastSeen.set(id, at);
    }
  }

  for (const a of answers) {
    const snap = snapById.get(a.qId);
    if (!snap) continue;
    const seenAt = lastSeen.get(a.qId);
    const xp = answerXp({
      difficulty: snap.difficulty,
      correct: a.correct,
      timeMs: a.timeMs,
      firstAttempt: seenAt === undefined,
      repeatedWithin24h: seenAt !== undefined && seenAt >= now - DAY_MS,
    });
    if (xp > 0) {
      await awardXp(userId, xp, a.correct ? "quiz_correct" : "effort", `${attemptId}:${a.qId}`);
    }
  }

  if (kind === "exam" && examId) {
    const bonusRef = `exam_bonus:${examId}`;
    const already = await XPTransactionModel.exists({ studentId: userId, refId: bonusRef });
    if (!already) await awardXp(userId, EXAM_BONUS_XP, "exam_bonus", bonusRef);
  }
}

async function updateStreak(userId: string, answers: OutcomeAnswer[], kind: string) {
  const answeredCount = answers.filter((a) => a.chosenKeys.length > 0).length;
  if (!isStreakQualifying({ questionsAnswered: answeredCount, examSubmitted: kind === "exam" })) return;

  const now = Date.now();
  const today = cairoDayKey();
  const yesterday = cairoDayKey(new Date(now - DAY_MS));
  const streak = await StreakModel.findOne({ studentId: userId });

  if (!streak) {
    await StreakModel.create({ studentId: userId, current: 1, longest: 1, lastActiveDay: today, history: [today] });
    return;
  }
  if (streak.lastActiveDay === today) return;

  streak.current = streak.lastActiveDay === yesterday ? streak.current + 1 : 1;
  streak.longest = Math.max(streak.longest, streak.current);
  streak.lastActiveDay = today;
  streak.history = [...(streak.history ?? []), today].slice(-60);
  await streak.save();
}

export async function recordAttemptOutcomes(input: AttemptOutcomeInput): Promise<void> {
  await dbConnect();
  await updateMastery(input.userId, input.answers, input.snapshots);
  await updateMistakes(input.userId, input.answers, input.snapshots);
  await updateXp(input);
  await updateStreak(input.userId, input.answers, input.kind);
  await evaluateAchievements(input.userId);
}
