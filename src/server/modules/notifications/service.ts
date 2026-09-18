import { CAIRO_TZ, cairoDayStartUTC, cairoDayKey } from "@/lib/cairo";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import {
  NOTIFICATION_TYPES,
  NotificationModel,
  NotificationPreferenceModel,
} from "./notification.model";
import { getNotificationProvider, type NotificationProvider, type NotificationEmailPayload } from "./provider";
import { logServerError } from "@/server/logger";

export { NOTIFICATION_TYPES } from "./notification.model";
export type { NotificationType } from "./notification.model";

export const QUIET_HOURS_START = 22;
export const QUIET_HOURS_END = 7;

export function cairoHour(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function inQuietHours(at: Date = new Date()): boolean {
  const hour = cairoHour(at);
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

export function nextQuietHoursEnd(at: Date = new Date()): Date {
  const todayStart = cairoDayStartUTC(at).getTime();
  const todayEnd = todayStart + QUIET_HOURS_END * 3600_000;
  if (at.getTime() >= todayEnd) {
    const nextStart = cairoDayStartUTC(new Date(todayEnd + 24 * 3600_000)).getTime();
    return new Date(nextStart + QUIET_HOURS_END * 3600_000);
  }
  return new Date(todayEnd);
}

export type NotificationSendPlan = {
  status: "sent" | "pending";
  emailStatus: "none" | "pending" | "sent" | "failed";
  scheduledFor: Date | null;
};

export function planNotificationSend(input: { wantEmail: boolean; now?: Date }): NotificationSendPlan {
  const now = input.now ?? new Date();
  if (!input.wantEmail) return { status: "sent", emailStatus: "none", scheduledFor: null };
  if (inQuietHours(now)) {
    return { status: "pending", emailStatus: "pending", scheduledFor: nextQuietHoursEnd(now) };
  }
  return { status: "sent", emailStatus: "pending", scheduledFor: null };
}

export async function getNotificationPreferences(userId: string): Promise<{ email: boolean; push: boolean }> {
  await dbConnect();
  const found = await NotificationPreferenceModel.findOne({ userId }).lean();
  return { email: found?.email ?? true, push: found?.push ?? true };
}

export async function updateNotificationPreferences(
  userId: string,
  patch: { email?: boolean; push?: boolean },
): Promise<{ email: boolean; push: boolean }> {
  await dbConnect();
  const set: Record<string, boolean> = {};
  if (patch.email !== undefined) set.email = patch.email;
  if (patch.push !== undefined) set.push = patch.push;
  if (Object.keys(set).length === 0) return getNotificationPreferences(userId);
  const doc = await NotificationPreferenceModel.findOneAndUpdate(
    { userId },
    { $set: set },
    { upsert: true, new: true },
  );
  return { email: doc.email, push: doc.push };
}

export type CreateNotificationInput = {
  userId: string;
  type: (typeof NOTIFICATION_TYPES)[number];
  titleAr: string;
  bodyAr: string;
  link?: string | null;
  emailTo?: string | null;
  dedupKey?: string | null;
};

const MAX_PER_USER = 50;

export async function pruneNotifications(userId: string, max = MAX_PER_USER): Promise<number> {
  const kept = await NotificationModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(max)
    .select("_id")
    .lean();
  const removed = await NotificationModel.deleteMany({
    userId,
    _id: { $nin: kept.map((n) => n._id) },
  });
  return removed.deletedCount;
}

export async function createNotification(
  input: CreateNotificationInput,
  opts: { now?: Date; provider?: NotificationProvider; scheduleFor?: Date } = {},
): Promise<NotificationDocPublic> {
  await dbConnect();
  const now = opts.now ?? new Date();

  if (input.dedupKey) {
    const existing = await NotificationModel.findOne({ userId: input.userId, dedupKey: input.dedupKey }).lean();
    if (existing) return toPublic(existing);
  }

  let status: "sent" | "pending" | "failed" = "sent";
  let emailStatus: "none" | "pending" | "sent" | "failed" = "none";
  let scheduledFor: Date | null = null;
  let sentAt: Date | null = null;

  if (opts.scheduleFor) {
    status = "pending";
    emailStatus = "pending";
    scheduledFor = opts.scheduleFor;
  } else {
    const wantEmail = Boolean(input.emailTo) && (await getNotificationPreferences(input.userId)).email;
    const plan = planNotificationSend({ wantEmail, now });
    status = plan.status;
    emailStatus = plan.emailStatus;
    scheduledFor = plan.scheduledFor;
    if (plan.status === "sent" && plan.emailStatus === "pending") {
      const provider = opts.provider ?? getNotificationProvider();
      const result = await provider.send({
        to: input.emailTo as string,
        subject: input.titleAr,
        bodyAr: input.bodyAr,
        link: input.link ?? null,
      } satisfies NotificationEmailPayload);
      if (result.ok) {
        emailStatus = "sent";
        sentAt = new Date();
      } else {
        emailStatus = "failed";
        status = "failed";
      }
    }
  }

  try {
    const doc = await NotificationModel.create({
      userId: input.userId,
      type: input.type,
      titleAr: input.titleAr,
      bodyAr: input.bodyAr,
      link: input.link ?? null,
      status,
      emailStatus,
      scheduledFor,
      sentAt,
      dedupKey: input.dedupKey ?? undefined,
    });
    await pruneNotifications(input.userId);
    return toPublic(doc);
  } catch (err: unknown) {
    if (input.dedupKey && isDuplicateKeyError(err)) {
      const existing = await NotificationModel.findOne({ userId: input.userId, dedupKey: input.dedupKey }).lean();
      if (existing) return toPublic(existing);
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

export type NotificationDocPublic = {
  id: string;
  type: (typeof NOTIFICATION_TYPES)[number];
  titleAr: string;
  bodyAr: string;
  link: string | null;
  status: "sent" | "pending" | "failed";
  emailStatus: "none" | "pending" | "sent" | "failed";
  readAt: string | null;
  createdAt: string;
};

function toPublic(doc: {
  _id: unknown;
  type: (typeof NOTIFICATION_TYPES)[number];
  titleAr: string;
  bodyAr: string;
  link: string | null;
  status: "sent" | "pending" | "failed";
  emailStatus: "none" | "pending" | "sent" | "failed";
  readAt: Date | null;
  createdAt: Date;
}): NotificationDocPublic {
  return {
    id: String(doc._id),
    type: doc.type,
    titleAr: doc.titleAr,
    bodyAr: doc.bodyAr,
    link: doc.link ?? null,
    status: doc.status,
    emailStatus: doc.emailStatus,
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export type NotificationListResult = {
  items: NotificationDocPublic[];
  total: number;
  unread: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export async function listNotifications(
  userId: string,
  opts: { page?: number; limit?: number } = {},
): Promise<NotificationListResult> {
  await dbConnect();
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 20)));
  const [total, unread, docs] = await Promise.all([
    NotificationModel.countDocuments({ userId }),
    NotificationModel.countDocuments({ userId, readAt: null }),
    NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  return {
    items: docs.map((d) => toPublic(d)),
    total,
    unread,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  await dbConnect();
  return NotificationModel.countDocuments({ userId, readAt: null });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  await dbConnect();
  const result = await NotificationModel.updateOne(
    { _id: notificationId, userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  await dbConnect();
  const result = await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return result.modifiedCount;
}

export async function processPendingNotifications(
  opts: { now?: Date; provider?: NotificationProvider; limit?: number } = {},
): Promise<{ processed: number; sent: number; failed: number }> {
  await dbConnect();
  const now = opts.now ?? new Date();
  const provider = opts.provider ?? getNotificationProvider();
  const pending = await NotificationModel.find({
    status: "pending",
    scheduledFor: { $lte: now },
  })
    .limit(opts.limit ?? 50)
    .lean();

  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const user = await UserModel.findById(item.userId).select("email").lean();
    if (!user?.email) {
      await NotificationModel.updateOne(
        { _id: item._id },
        { $set: { status: "failed", emailStatus: "failed" } },
      );
      failed += 1;
      continue;
    }
    const result = await provider.send({
      to: user.email,
      subject: item.titleAr,
      bodyAr: item.bodyAr,
      link: item.link ?? null,
    });
    if (result.ok) {
      await NotificationModel.updateOne(
        { _id: item._id },
        { $set: { status: "sent", emailStatus: "sent", sentAt: now, scheduledFor: null } },
      );
      sent += 1;
    } else {
      await NotificationModel.updateOne(
        { _id: item._id },
        { $set: { status: "failed", emailStatus: "failed" } },
      );
      failed += 1;
    }
  }
  return { processed: pending.length, sent, failed };
}

/* -----------------------------------------------------------
 * Weekly report batch (outbox pattern: Monday 05:00 Cairo).
 *------------------------------------------------------------ */

const dayFmtWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: CAIRO_TZ,
  weekday: "short",
});

const WEEKDAY_OFFSET: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function cairoMondayStartUTC(date: Date = new Date()): Date {
  const weekday = dayFmtWeekday.format(date) as keyof typeof WEEKDAY_OFFSET;
  const dayOffset = WEEKDAY_OFFSET[weekday] ?? 0;
  return new Date(cairoDayStartUTC(date).getTime() - dayOffset * 86_400_000);
}

export function cairoMonday0500UTC(date: Date = new Date()): Date {
  return new Date(cairoMondayStartUTC(date).getTime() + 5 * 3600_000);
}

export type WeeklyStats = {
  questionsAnswered: number;
  correct: number;
  exams: number;
  accuracyPct: number;
  xpEarned: number;
  streak: number;
  resolvedMistakes: number;
};

export async function buildWeeklyReportStats(userId: string, weekStart: Date): Promise<WeeklyStats> {
  await dbConnect();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

  const [attempts, xpRows, streakDoc, resolvedMistakes] = await Promise.all([
    (await import("@/server/modules/assessment/attempt.model")).AttemptModel.find({
      userId,
      status: "submitted",
      submittedAt: { $gte: weekStart, $lt: weekEnd },
    })
      .select("kind answers")
      .lean(),
    (await import("@/server/modules/gamification/xp.model")).XPTransactionModel.find({
      studentId: userId,
      createdAt: { $gte: weekStart, $lt: weekEnd },
    })
      .select("amount")
      .lean(),
    (await import("@/server/modules/mastery/streak.model")).StreakModel.findOne({ studentId: userId })
      .select("current")
      .lean(),
    (await import("@/server/modules/mastery/mistake.model")).MistakeModel.countDocuments({
      studentId: userId,
      resolvedAt: { $gte: weekStart, $lt: weekEnd },
    }),
  ]);

  let questionsAnswered = 0;
  let correct = 0;
  let exams = 0;
  for (const a of attempts) {
    for (const ans of a.answers ?? []) {
      if (ans.skipped) continue;
      questionsAnswered += 1;
      if (ans.correct) correct += 1;
    }
    if (a.kind === "exam") exams += 1;
  }

  return {
    questionsAnswered,
    correct,
    exams,
    accuracyPct: questionsAnswered > 0 ? Math.round((correct / questionsAnswered) * 100) : 0,
    xpEarned: xpRows.reduce((sum, r) => sum + r.amount, 0),
    streak: streakDoc?.current ?? 0,
    resolvedMistakes,
  };
}

export function weeklyReportMessageAr(s: WeeklyStats, weekEnd: Date): { titleAr: string; bodyAr: string } {
  const weekLabel = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: CAIRO_TZ }).format(weekEnd);
  return {
    titleAr: `تقرير الأسبوع — ${weekLabel}`,
    bodyAr: [
      `أجبت هذا الأسبوع على ${s.questionsAnswered} سؤالًا بدقة ${s.accuracyPct}%`,
      s.exams > 0 ? `وخضت ${s.exams} امتحان(ات)` : null,
      s.xpEarned > 0 ? `وربحت ${s.xpEarned} نقطة خبرة` : null,
      s.streak > 0 ? `سلسلتك الحالية: ${s.streak} يومًا` : null,
      s.resolvedMistakes > 0 ? `وقفشت ${s.resolvedMistakes} خطأ.` : ".",
    ]
      .filter(Boolean)
      .join(" ") + "\nاستمر في التقدم على مسارك!",
  };
}

export type WeeklyBatchResult = {
  skipped: boolean;
  created: number;
  at: Date;
};

export async function runWeeklyReportBatch(
  opts: { now?: Date } = {},
): Promise<WeeklyBatchResult> {
  const now = opts.now ?? new Date();
  const deliverAt = cairoMonday0500UTC(now);
  if (now.getTime() < deliverAt.getTime()) {
    return { skipped: true, created: 0, at: now };
  }

  await dbConnect();
  const weekStart = cairoMondayStartUTC(now);
  const reportStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const weekKey = cairoDayKey(reportStart);

  const users = await UserModel.find({ status: "active", role: { $in: ["student", "teacher"] } })
    .select("_id email")
    .lean();
  const ids = users.filter((u) => Boolean(u.email)).map((u) => u._id);
  const prefsList = ids.length
    ? await NotificationPreferenceModel.find({ userId: { $in: ids } }).select("userId email").lean()
    : [];
  const emailPrefByUser = new Map(prefsList.map((p) => [String(p.userId), p.email]));

  let created = 0;
  for (const u of users) {
    if (!u.email) continue;
    if (emailPrefByUser.get(String(u._id)) === false) continue;
    const stats = await buildWeeklyReportStats(String(u._id), reportStart);
    if (stats.questionsAnswered === 0 && stats.xpEarned === 0) continue;
    const { titleAr, bodyAr } = weeklyReportMessageAr(stats, weekStart);
    try {
      await createNotification(
        {
          userId: String(u._id),
          type: "weekly_report",
          titleAr,
          bodyAr,
          link: "/progress",
          emailTo: u.email,
          dedupKey: `weekly_report:${weekKey}:${u._id}`,
        },
        { scheduleFor: deliverAt },
      );
      created += 1;
    } catch (e) {
      await logServerError("notifications.weekly_report.failed", e, {
        user: String(u._id),
        weekKey,
      });
    }
  }
  return { skipped: false, created, at: now };
}