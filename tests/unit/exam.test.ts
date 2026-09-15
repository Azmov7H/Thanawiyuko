import { describe, expect, it } from "vitest";
import {
  analyzeAttempt,
  isPastDeadline,
  SUBMIT_GRACE_MS,
  validateBlueprint,
} from "@/server/modules/assessment/scoring";

describe("isPastDeadline (server clock authoritative)", () => {
  const deadline = 1_000_000;
  it("allows submit exactly at deadline and inside grace", () => {
    expect(isPastDeadline(deadline, deadline)).toBe(false);
    expect(isPastDeadline(deadline, deadline + SUBMIT_GRACE_MS - 1)).toBe(false);
  });
  it("flags submit after deadline + grace as late", () => {
    expect(isPastDeadline(deadline, deadline + SUBMIT_GRACE_MS + 1)).toBe(true);
  });
});

describe("validateBlueprint (publish gate)", () => {
  it("passes when every row is covered", () => {
    expect(
      validateBlueprint(
        [
          { topicId: "t1", count: 5 },
          { topicId: "t2", count: 3 },
        ],
        new Map([
          ["t1", 10],
          ["t2", 3],
        ]),
      ),
    ).toEqual([]);
  });
  it("reports deficits per row", () => {
    const d = validateBlueprint([{ topicId: "t1", count: 5 }], { t1: 2 });
    expect(d).toHaveLength(1);
    expect(d[0]).toContain("t1");
  });
});

describe("analyzeAttempt", () => {
  const snaps = [
    { qId: "q1", topicId: "A", conceptTags: ["tag-x"] },
    { qId: "q2", topicId: "A", conceptTags: ["tag-x"] },
    { qId: "q3", topicId: "B", conceptTags: ["tag-y"] },
  ];
  const graded = [
    { qId: "q1", chosenKeys: ["a"], correct: true, skipped: false, timeMs: 1000 },
    { qId: "q2", chosenKeys: ["a"], correct: false, skipped: false, timeMs: 3000 },
    { qId: "q3", chosenKeys: [], correct: false, skipped: true, timeMs: 0 },
  ];

  it("computes score, per-topic stats, misconceptions, next actions", () => {
    const a = analyzeAttempt(snaps, graded);
    expect(a.score).toBe(1);
    expect(a.total).toBe(3);
    expect(a.accuracy).toBe(33);
    expect(a.totalTimeMs).toBe(4000);
    const byTopic = Object.fromEntries(a.perTopic.map((t) => [t.topicId, t]));
    expect(byTopic.A.accuracy).toBe(50);
    expect(byTopic.B.accuracy).toBe(0);
    // worst topic first
    expect(a.perTopic[0].topicId).toBe("B");
    // misconceptions only from wrong answers
    expect(a.misconceptions.map((m) => m.tag).sort()).toEqual(["tag-x", "tag-y"]);
    expect(a.nextTopics).toEqual(["B", "A"]);
  });

  it("returns empty next actions on a perfect attempt", () => {
    const perfect = graded.map((g) => ({ ...g, correct: true, skipped: false }));
    const a = analyzeAttempt(snaps, perfect);
    expect(a.accuracy).toBe(100);
    expect(a.nextTopics).toEqual([]);
    expect(a.misconceptions).toEqual([]);
  });
});
