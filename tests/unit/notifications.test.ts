import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES } from "@/server/modules/notifications";
import {
  cairoHour,
  inQuietHours,
  nextQuietHoursEnd,
  planNotificationSend,
  cairoMondayStartUTC,
  cairoMonday0500UTC,
  weeklyReportMessageAr,
} from "@/server/modules/notifications/service";
import { getNotificationProvider, maskEmail } from "@/server/modules/notifications/provider";

describe("notification types", () => {
  it("covers the MVP transactional types + weekly report", () => {
    expect(NOTIFICATION_TYPES).toEqual([
      "welcome",
      "plan_ready",
      "streak_milestone",
      "subscription_event",
      "content_correction",
      "weekly_report",
    ]);
  });
});

describe("quiet hours (22:00–07:00 Cairo)", () => {
  it("reports the Cairo wall-clock hour", () => {
    expect(cairoHour(new Date("2024-02-10T12:00:00.000Z"))).toBe(14);
    expect(cairoHour(new Date("2024-02-11T04:30:00.000Z"))).toBe(6);
  });

  it("treats 22:00–07:00 Cairo as quiet", () => {
    expect(inQuietHours(new Date("2024-02-10T08:00:00.000Z"))).toBe(false);
    expect(inQuietHours(new Date("2024-02-10T19:59:00.000Z"))).toBe(false);
    expect(inQuietHours(new Date("2024-02-10T20:00:00.000Z"))).toBe(true);
    expect(inQuietHours(new Date("2024-02-10T22:30:00.000Z"))).toBe(true);
    expect(inQuietHours(new Date("2024-02-11T04:30:00.000Z"))).toBe(true);
    expect(inQuietHours(new Date("2024-02-11T05:00:00.000Z"))).toBe(false);
  });

  it("computes the next 07:00 Cairo", () => {
    const sameDay = nextQuietHoursEnd(new Date("2024-02-11T04:30:00.000Z"));
    expect(sameDay.toISOString()).toBe("2024-02-11T05:00:00.000Z");
    const nextDay = nextQuietHoursEnd(new Date("2024-02-10T22:30:00.000Z"));
    expect(nextDay.toISOString()).toBe("2024-02-11T05:00:00.000Z");
  });
});

describe("planNotificationSend", () => {
  it("skips email when not requested", () => {
    expect(planNotificationSend({ wantEmail: false })).toEqual({
      status: "sent",
      emailStatus: "none",
      scheduledFor: null,
    });
  });

  it("holds non-quiet sends as immediate-send pending", () => {
    const plan = planNotificationSend({
      wantEmail: true,
      now: new Date("2024-02-10T08:00:00.000Z"),
    });
    expect(plan.status).toBe("sent");
    expect(plan.emailStatus).toBe("pending");
    expect(plan.scheduledFor).toBeNull();
  });

  it("delays sends inside quiet hours until 07:00 Cairo", () => {
    const plan = planNotificationSend({
      wantEmail: true,
      now: new Date("2024-02-10T22:30:00.000Z"),
    });
    expect(plan.status).toBe("pending");
    expect(plan.emailStatus).toBe("pending");
    expect(plan.scheduledFor?.toISOString()).toBe("2024-02-11T05:00:00.000Z");
  });
});

describe("notification email masking", () => {
  it("masks the recipient address so logs carry no PII", () => {
    expect(maskEmail("ahmed@example.com")).toBe("a***@e***");
    expect(maskEmail("ab@example.com")).toBe("a*@e***");
    expect(maskEmail("a@b.co")).toBe("***@***");
    expect(maskEmail("x@y.com")).toBe("***@***");
  });
});

describe("provider resolution", () => {
  it("defaults to console and resolves resend; rejects unknown names", () => {
    expect(getNotificationProvider(undefined).name).toBe("console");
    expect(getNotificationProvider("console").name).toBe("console");
    expect(getNotificationProvider("resend").name).toBe("resend");
    expect(() => getNotificationProvider("mailgun")).toThrow(/Unknown NOTIFICATION_PROVIDER/);
  });
});

describe("weekly report scheduling (Monday 05:00 Cairo)", () => {
  it("finds the Monday 00:00 Cairo boundary of any date (DST-safe)", () => {
    // 2024-02-10 is a Saturday; the containing week starts Mon 2024-02-05 00:00 Cairo = 22:00Z (winter +2).
    const start = cairoMondayStartUTC(new Date("2024-02-10T12:00:00.000Z"));
    expect(start.toISOString()).toBe("2024-02-04T22:00:00.000Z");
    // Monday itself maps to itself.
    expect(cairoMondayStartUTC(new Date("2024-02-05T08:00:00.000Z")).toISOString()).toBe("2024-02-04T22:00:00.000Z");
  });

  it("delivers at 05:00 Cairo on Monday", () => {
    expect(cairoMonday0500UTC(new Date("2024-02-10T12:00:00.000Z")).toISOString()).toBe("2024-02-05T03:00:00.000Z");
  });
});

describe("weekly report message", () => {
  it("builds a concise Arabic digest", () => {
    const { titleAr, bodyAr } = weeklyReportMessageAr(
      { questionsAnswered: 42, correct: 33, exams: 1, accuracyPct: 79, xpEarned: 210, streak: 9, resolvedMistakes: 3 },
      new Date("2024-02-12T00:00:00.000Z"),
    );
    expect(titleAr).toContain("تقرير الأسبوع");
    expect(bodyAr).toContain("42");
    expect(bodyAr).toContain("79%");
    expect(bodyAr).toContain("210");
    expect(bodyAr).toContain("9");
    expect(bodyAr).toContain("استمر في التقدم على مسارك!");
  });
});