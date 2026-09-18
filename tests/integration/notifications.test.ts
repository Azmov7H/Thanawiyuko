import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb, resetTestDb } from "./helpers/db";
import { createUser } from "./helpers/seed";
import {
  createNotification,
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
  processPendingNotifications,
  updateNotificationPreferences,
} from "@/server/modules/notifications/service";
import { consoleNotificationProvider } from "@/server/modules/notifications/provider";

const QUIET_NOW = new Date("2024-02-10T22:30:00.000Z");

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(resetTestDb);

describe("notification inbox", () => {
  it("creates, lists, marks read and counts unread", async () => {
    const user = await createUser({ email: "notify-user@test.dev" });
    const userId = String(user._id);

    await createNotification({
      userId,
      type: "welcome",
      titleAr: "أهلاً بيك",
      bodyAr: "كمل بياناتك.",
      link: "/onboarding",
      emailTo: "notify-user@test.dev",
    });

    const list = await listNotifications(userId, { page: 1, limit: 10 });
    expect(list.total).toBe(1);
    expect(list.unread).toBe(1);
    expect(list.items[0].titleAr).toBe("أهلاً بيك");
    expect(list.items[0].type).toBe("welcome");

    expect(await getUnreadNotificationCount(userId)).toBe(1);
    const read = await markNotificationRead(userId, list.items[0].id);
    expect(read).toBe(true);
    expect(await getUnreadNotificationCount(userId)).toBe(0);
    expect(await markNotificationRead(userId, list.items[0].id)).toBe(false);
  });

  it("respects the email preference toggle", async () => {
    const user = await createUser({ email: "prefs@test.dev" });
    const userId = String(user._id);
    await updateNotificationPreferences(userId, { email: false });

    await createNotification({
      userId,
      type: "plan_ready",
      titleAr: "خطتك جاهزة",
      bodyAr: "ابدأ بالدرس الأول.",
      emailTo: "prefs@test.dev",
    });

    const list = await listNotifications(userId);
    expect(list.items[0].emailStatus).toBe("none");
  });
});

describe("quiet-hours scheduling", () => {
  it("holds email until 07:00 Cairo and drains on process", async () => {
    const user = await createUser({ email: "quiet@test.dev" });
    const userId = String(user._id);

    await createNotification(
      {
        userId,
        type: "streak_milestone",
        titleAr: "سلسلة جديدة",
        bodyAr: "أكملت ٧ أيام متتالية.",
        emailTo: "quiet@test.dev",
      },
      { now: QUIET_NOW, provider: consoleNotificationProvider },
    );

    const list = await listNotifications(userId);
    expect(list.items[0].status).toBe("pending");
    expect(list.items[0].emailStatus).toBe("pending");

    const drain = await processPendingNotifications({
      now: new Date("2024-02-11T05:00:00.000Z"),
      provider: consoleNotificationProvider,
    });
    expect(drain.processed).toBe(1);
    expect(drain.sent).toBe(1);

    const after = await listNotifications(userId);
    expect(after.items[0].status).toBe("sent");
    expect(after.items[0].emailStatus).toBe("sent");
  });
});