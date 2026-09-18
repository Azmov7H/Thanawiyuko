import { CAIRO_TZ, cairoDayStartUTC } from "@/lib/cairo";
import { dbConnect } from "@/server/db/client";
import { UserModel } from "@/server/modules/auth/user.model";
import { NOTIFICATION_TYPES, NotificationModel, NotificationPreferenceModel } from "./notification.model";
import { getNotificationProvider, type NotificationProvider, type NotificationEmailPayload } from "./provider";

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
  opts: { now?: Date; provider?: NotificationProvider } = {},
): Promise<NotificationDocPublic> {
  await dbConnect();
  const now = opts.now ?? new Date();
  const wantEmail =
    Boolean(input.emailTo) && (await getNotificationPreferences(input.userId)).email;
  const plan = planNotificationSend({ wantEmail, now });
  let status: "sent" | "pending" | "failed" = plan.status;
  let emailStatus: "none" | "pending" | "sent" | "failed" = plan.emailStatus;
  let sentAt: Date | null = null;
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
  const doc = await NotificationModel.create({
    userId: input.userId,
    type: input.type,
    titleAr: input.titleAr,
    bodyAr: input.bodyAr,
    link: input.link ?? null,
    status,
    emailStatus,
    scheduledFor: plan.scheduledFor,
    sentAt,
  });
  await pruneNotifications(input.userId);
  return toPublic(doc);
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