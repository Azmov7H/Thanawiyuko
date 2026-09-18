import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createUser } from "./helpers/seed";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processPendingNotifications,
  runWeeklyReportBatch,
  updateNotificationPreferences,
} from "@/server/modules/notifications/service";
import { NotificationModel } from "@/server/modules/notifications/notification.model";
import { AttemptModel } from "@/server/modules/assessment/attempt.model";
import { consoleNotificationProvider } from "@/server/modules/notifications/provider";

const MONDAY_AFTER_DROP = new Date("2024-02-12T08:00:00.000Z");

async function seedUserWithAttempt(email: string, role: "student" | "teacher" = "student") {
  const user = await createUser({ email, role });
  const userId = String(user._id);
  await AttemptModel.create({
    studentId: user._id,
    userId: user._id,
    kind: "practice",
    clientAttemptId: `weekly-${Date.now()}-${Math.random()}`,
    shuffleSeed: 1,
    total: 3,
    snapshots: [],
    status: "submitted",
    submittedAt: new Date("2024-02-08T12:00:00.000Z"),
    answers: [
      {
        qId: new mongoose.Types.ObjectId(),
        correct: true,
        skipped: false,
        checked: true,
        timeMs: 5000,
      },
      {
        qId: new mongoose.Types.ObjectId(),
        correct: true,
        skipped: false,
        checked: true,
        timeMs: 4000,
      },
    ],
  });
  return { user, userId };
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(resetTestDb);

describe("dedup keys", () => {
  it("creates a single row for repeated dedupKey writes", async () => {
    const user = await createUser({ email: "dedup@test.dev" });
    const userId = String(user._id);
    const input = {
      userId,
      type: "content_correction" as const,
      titleAr: "تصحيح محتوى",
      bodyAr: "تحديث في شرح الدرس.",
      dedupKey: "content:phy9",
    };

    const first = await createNotification(input);
    const second = await createNotification(input);
    expect(second.id).toBe(first.id);
    expect(await NotificationModel.countDocuments({ userId })).toBe(1);
  });
});

describe("scheduled delivery (outbox)", () => {
  it("holds as pending until scheduleFor then drains", async () => {
    const user = await createUser({ email: "sched@test.dev" });
    const userId = String(user._id);
    const deliverAt = new Date("2024-02-12T03:00:00.000Z");

    await createNotification(
      {
        userId,
        type: "weekly_report",
        titleAr: "تقرير الأسبوع",
        bodyAr: "محتوى التقرير.",
        emailTo: "sched@test.dev",
      },
      { scheduleFor: deliverAt, provider: consoleNotificationProvider },
    );

    const before = await listNotifications(userId);
    expect(before.items[0].status).toBe("pending");
    expect(before.items[0].emailStatus).toBe("pending");

    const early = await processPendingNotifications({
      now: new Date("2024-02-12T02:00:00.000Z"),
      provider: consoleNotificationProvider,
    });
    expect(early.processed).toBe(0);

    const drain = await processPendingNotifications({
      now: new Date("2024-02-12T04:00:00.000Z"),
      provider: consoleNotificationProvider,
    });
    expect(drain.processed).toBe(1);
    expect(drain.sent).toBe(1);

    const after = await listNotifications(userId);
    expect(after.items[0].status).toBe("sent");
    expect(after.items[0].emailStatus).toBe("sent");
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread notification as read in one call", async () => {
    const user = await createUser({ email: "readall@test.dev" });
    const userId = String(user._id);

    const n1 = await createNotification({
      userId,
      type: "plan_ready",
      titleAr: "خطتك جاهزة",
      bodyAr: "ابدأ.",
    });
    const n2 = await createNotification({
      userId,
      type: "streak_milestone",
      titleAr: "سلسلة 5 أيام",
      bodyAr: "أحسنتك.",
    });
    await markNotificationRead(userId, n1.id);

    const marked = await markAllNotificationsRead(userId);
    expect(marked).toBe(1);
    const list = await listNotifications(userId);
    expect(list.unread).toBe(0);
    expect(list.items.every((i) => i.readAt !== null)).toBe(true);
    expect(n2.id).not.toBe(n1.id);
  });
});

describe("weekly report batch", () => {
  it("skips before Monday 05:00 Cairo", async () => {
    const { userId } = await seedUserWithAttempt("early@test.dev");
    const result = await runWeeklyReportBatch({
      now: new Date("2024-02-12T02:00:00.000Z"),
    });
    expect(result.skipped).toBe(true);
    expect(result.created).toBe(0);
    expect(await NotificationModel.countDocuments({ userId })).toBe(0);
  });

  it("creates one weekly report per active student with activity and is idempotent", async () => {
    const { userId, user } = await seedUserWithAttempt("weekly@test.dev");

    const first = await runWeeklyReportBatch({ now: MONDAY_AFTER_DROP });
    expect(first.skipped).toBe(false);
    expect(first.created).toBe(1);

    const list = await listNotifications(userId);
    expect(list.total).toBe(1);
    expect(list.items[0].type).toBe("weekly_report");
    expect(list.items[0].titleAr).toContain("تقرير الأسبوع");
    expect(list.items[0].bodyAr).toContain("2");
    expect(list.items[0].emailStatus).toBe("pending");

    await runWeeklyReportBatch({ now: MONDAY_AFTER_DROP });
    expect(await NotificationModel.countDocuments({ userId })).toBe(1);
    expect(user.email).toBe("weekly@test.dev");
  });

  it("excludes suspended and non-student/teacher roles even with activity", async () => {
    const suspended = await createUser({ email: "suspended@test.dev", status: "suspended" });
    const admin = await createUser({ email: "admin@test.dev", role: "admin" });
    for (const u of [suspended, admin]) {
      await AttemptModel.create({
        studentId: u._id,
        userId: u._id,
        kind: "practice",
        clientAttemptId: `weekly-${Date.now()}-${Math.random()}`,
        shuffleSeed: 1,
        total: 1,
        snapshots: [],
        status: "submitted",
        submittedAt: new Date("2024-02-08T12:00:00.000Z"),
      });
    }

    const result = await runWeeklyReportBatch({ now: MONDAY_AFTER_DROP });
    expect(result.skipped).toBe(false);
    expect(result.created).toBe(0);
    expect(await NotificationModel.countDocuments({ userId: String(suspended._id) })).toBe(0);
    expect(await NotificationModel.countDocuments({ userId: String(admin._id) })).toBe(0);
  });

  it("honors email preference: opt-out users get no report", async () => {
    const { userId } = await seedUserWithAttempt("optout2@test.dev");
    await updateNotificationPreferences(userId, { email: false });

    await runWeeklyReportBatch({ now: MONDAY_AFTER_DROP });
    expect(await NotificationModel.countDocuments({ userId })).toBe(0);
  });

  it("includes teachers with activity", async () => {
    const { userId } = await seedUserWithAttempt("teacher@test.dev", "teacher");
    await runWeeklyReportBatch({ now: MONDAY_AFTER_DROP });
    const list = await listNotifications(userId);
    expect(list.total).toBe(1);
    expect(list.items[0].type).toBe("weekly_report");
  });
});