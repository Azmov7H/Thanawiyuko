import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { dbConnect } from "@/server/db/client";
import { hashPassword } from "@/lib/password";
import { UserModel } from "@/server/modules/auth/user.model";
import { StudentProfileModel } from "@/server/modules/academic/student-profile.model";
import { StudySessionModel } from "@/server/modules/academic/study-session.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { StudyPlanModel } from "@/server/modules/planning/study-plan.model";
import { MistakeModel } from "@/server/modules/mastery/mistake.model";
import { StreakModel } from "@/server/modules/mastery/streak.model";
import { TopicMasteryModel } from "@/server/modules/mastery/topic-mastery.model";
import { XPTransactionModel } from "@/server/modules/gamification/xp.model";
import { UserAchievementModel, AchievementModel } from "@/server/modules/gamification/achievement.model";
import { AIConversationModel } from "@/server/modules/ai/conversation.model";
import { SubscriptionModel } from "@/server/modules/billing/subscription.model";
import { AuditLogModel } from "@/server/modules/admin/audit-log.model";

export const DELETION_GRACE_DAYS = Number(process.env.DELETION_GRACE_DAYS ?? 30);

export function deletionPurgeAt(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/** Mark an account for deletion (soft delete). Idempotent; keeps the original date. */
export async function requestAccountDeletion(
  userId: string,
): Promise<{ deletionRequestedAt: Date; purgeAt: Date }> {
  await dbConnect();
  const oid = new mongoose.Types.ObjectId(userId);
  const user = await UserModel.findById(oid).lean();
  if (!user) throw new Error("USER_NOT_FOUND");

  const requestedAt = user.deletionRequestedAt ?? new Date();
  await UserModel.updateOne(
    { _id: oid },
    { $set: { status: "deletion_pending", deletionRequestedAt: requestedAt } },
  );
  await AuditLogModel.create({
    actorId: oid,
    action: "account.delete_request",
    entity: "user",
    entityId: userId,
    after: { deletionRequestedAt: requestedAt },
  });
  return { deletionRequestedAt: requestedAt, purgeAt: deletionPurgeAt(requestedAt) };
}

/** Cancel a pending deletion. Returns cursor state (true when reverted). */
export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  await dbConnect();
  const oid = new mongoose.Types.ObjectId(userId);
  const res = await UserModel.updateOne(
    { _id: oid, status: "deletion_pending" },
    { $set: { status: "active", deletionRequestedAt: null } },
  );
  if (res.modifiedCount === 0) return false;
  await AuditLogModel.create({
    actorId: oid,
    action: "account.delete_cancel",
    entity: "user",
    entityId: userId,
  });
  return true;
}

/** Full JSON export of the student's own data (no password material). */
export async function exportAccount(userId: string): Promise<Record<string, unknown>> {
  await dbConnect();
  const oid = new mongoose.Types.ObjectId(userId);

  const [user, profile, subscription, attempts, mastery, mistakes, xp, streak, unlocked, plan, sessions, conversations] =
    await Promise.all([
      UserModel.findById(oid).lean(),
      StudentProfileModel.findOne({ userId: oid }).lean(),
      SubscriptionModel.findOne({ studentId: oid }).lean(),
      AttemptModel.find({ userId: oid, status: "submitted" })
        .select("kind score total accuracy startedAt submittedAt examId")
        .lean(),
      TopicMasteryModel.find({ studentId: oid }).lean(),
      MistakeModel.find({ studentId: oid }).lean(),
      XPTransactionModel.find({ studentId: oid }).lean(),
      StreakModel.findOne({ studentId: oid }).lean(),
      UserAchievementModel.find({ studentId: oid }).lean(),
      StudyPlanModel.find({ studentId: oid }).lean(),
      StudySessionModel.find({ studentId: oid }).lean(),
      AIConversationModel.find({ studentId: oid }).lean(),
    ]);

  const achievementIds = unlocked.map((u) => u.achievementId);
  const achievements = achievementIds.length
    ? await AchievementModel.find({ _id: { $in: achievementIds } }).select("code titleAr").lean()
    : [];

  const safeUser = user
    ? {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        guardianConsentAt: user.guardianConsentAt ?? null,
        createdAt: user.createdAt,
      }
    : null;

  return {
    exportedAt: new Date().toISOString(),
    user: safeUser,
    profile,
    subscription,
    attempts,
    mastery,
    mistakes,
    xp,
    streak,
    achievements,
    studyPlan: plan,
    studySessions: sessions,
    aiConversations: conversations,
  };
}

/**
 * Irreversibly anonymize an account and delete identity-linked data.
 * Kept: Payment (tax basis), AuditLog (integrity), Attempt (pseudonymous stats).
 */
export async function purgeUser(userId: string): Promise<void> {
  await dbConnect();
  const oid = new mongoose.Types.ObjectId(userId);
  const user = await UserModel.findById(oid).lean();
  if (!user || user.status === "deleted") return;

  const scrubHash = await hashPassword(randomBytes(32).toString("hex"));
  await UserModel.updateOne(
    { _id: oid },
    {
      $set: {
        name: `مستخدم محذوف ${String(oid).slice(-6)}`,
        email: `deleted_${oid}@thanawico.local`,
        passwordHash: scrubHash,
        status: "deleted",
        deletedAt: new Date(),
        deletionRequestedAt: null,
      },
    },
  );

  await Promise.all([
    StudentProfileModel.deleteOne({ userId: oid }),
    StudyPlanModel.deleteMany({ studentId: oid }),
    StudySessionModel.deleteMany({ studentId: oid }),
    MistakeModel.deleteMany({ studentId: oid }),
    StreakModel.deleteOne({ studentId: oid }),
    TopicMasteryModel.deleteMany({ studentId: oid }),
    XPTransactionModel.deleteMany({ studentId: oid }),
    UserAchievementModel.deleteMany({ studentId: oid }),
    AIConversationModel.updateMany({ studentId: oid }, { $set: { messages: [], title: null } }),
    SubscriptionModel.updateOne(
      { studentId: oid },
      { $set: { status: "cancelled", tier: "free", cancelAtPeriodEnd: true, cancelledAt: new Date() } },
    ),
  ]);

  await AuditLogModel.create({
    actorId: oid,
    action: "account.final_delete",
    entity: "user",
    entityId: userId,
    reason: `system:deletion_grace_expired_${DELETION_GRACE_DAYS}d`,
  });
}

/** Cron: purge accounts whose grace period has elapsed. */
export async function processFinalDeletion(): Promise<{ purged: number }> {
  await dbConnect();
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const due = await UserModel.find({
    status: "deletion_pending",
    deletionRequestedAt: { $lt: cutoff },
  })
    .select("_id")
    .lean();

  for (const u of due) {
    await purgeUser(String(u._id));
  }
  return { purged: due.length };
}
