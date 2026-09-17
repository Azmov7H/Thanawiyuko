import { describe, expect, it } from "vitest";
import { generatePlan } from "@/lib/planner";

describe("generatePlan deterministic greedy", () => {
  const future = new Date(Date.now() + 60 * 24 * 3600 * 1000); // 60 days from now
  const topics = new Map([
    ["t1", { masteryScore: 30, band: "weak", n: 10, subjectId: "s1", examWeight: 18 }],
    ["t2", { masteryScore: 55, band: "developing", n: 15, subjectId: "s1", examWeight: 18 }],
    ["t3", { masteryScore: 80, band: "proficient", n: 20, subjectId: "s2", examWeight: 15 }],
    ["t4", { masteryScore: 90, band: "mastered", n: 30, subjectId: "s2", examWeight: 15 }],
  ]);
  const due = [{ topicId: "t1", conceptTag: "newton" }];

  it("allocates review budget first", () => {
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 60,
      topics,
      mistakesDue: due,
      recentActivity: {},
      subjectWeights: new Map([["s1", 18], ["s2", 15]]),
    });
    const review = plan.find((p) => p.action === "review");
    expect(review).toBeTruthy();
    expect(review?.topicId).toBe("t1");
    expect(review?.reason).toContain("مراجعة مستحقة");
  });

  it("respects 20% review budget cap", () => {
    const manyDue = [
      { topicId: "t1", conceptTag: "a" },
      { topicId: "t2", conceptTag: "b" },
      { topicId: "t3", conceptTag: "c" },
      { topicId: "t4", conceptTag: "d" },
    ];
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 60,
      topics,
      mistakesDue: manyDue,
      recentActivity: {},
      subjectWeights: new Map([["s1", 18], ["s2", 15]]),
    });
    const reviewMins = plan.filter((p) => p.action === "review").reduce((n, p) => n + p.minutes, 0);
    expect(reviewMins).toBeLessThanOrEqual(12); // 20% of 60
  });

  it("exam-close mode tags first item when <30 days", () => {
    const soon = new Date(Date.now() + 9 * 24 * 3600 * 1000); // 9 days
    const plan = generatePlan({
      targetExamDate: soon,
      dailyMinutes: 60,
      topics,
      mistakesDue: [],
      recentActivity: {},
      subjectWeights: new Map([["s1", 18], ["s2", 15]]),
    });
    expect(plan[0].reason).toContain("نمط امتحان");
  });

  it("never exceeds daily minutes", () => {
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 45,
      topics,
      mistakesDue: [],
      recentActivity: {},
      subjectWeights: new Map([["s1", 18], ["s2", 15]]),
    });
    const total = plan.reduce((n, p) => n + p.minutes, 0);
    expect(total).toBeLessThanOrEqual(45);
  });

  it("prioritizes neglected topics over recently practiced ones", () => {
    const same = new Map([
      ["t1", { masteryScore: 40, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
      ["t2", { masteryScore: 40, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
    ]);
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 60,
      topics: same,
      mistakesDue: [],
      recentActivity: { t1: 0, t2: 30 },
      subjectWeights: new Map([["s1", 10]]),
    });
    expect(plan[0]?.topicId).toBe("t2");
  });

  it("prioritizes higher subject weights", () => {
    const same = new Map([
      ["t1", { masteryScore: 40, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
      ["t2", { masteryScore: 40, band: "weak", n: 10, subjectId: "s2", examWeight: 1 }],
    ]);
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 60,
      topics: same,
      mistakesDue: [],
      recentActivity: {},
      subjectWeights: new Map([["s1", 10], ["s2", 40]]),
    });
    expect(plan[0]?.topicId).toBe("t2");
  });

  it("caps learning topics at 2 per subject per day", () => {
    const many = new Map([
      ["t1", { masteryScore: 30, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
      ["t2", { masteryScore: 30, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
      ["t3", { masteryScore: 30, band: "weak", n: 10, subjectId: "s1", examWeight: 1 }],
      ["t4", { masteryScore: 30, band: "weak", n: 10, subjectId: "s2", examWeight: 1 }],
    ]);
    const plan = generatePlan({
      targetExamDate: future,
      dailyMinutes: 180,
      topics: many,
      mistakesDue: [],
      recentActivity: {},
      subjectWeights: new Map([["s1", 10], ["s2", 10]]),
    });
    const s1 = plan.filter((p) => p.subjectId === "s1" && p.action !== "review");
    expect(s1.length).toBeLessThanOrEqual(2);
  });
});