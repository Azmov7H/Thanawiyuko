import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  assertNoLeak,
  gradeAnswers,
  scoreOf,
  toPublic,
} from "@/server/modules/assessment/scoring";
import type { QuestionSnapshot } from "@/server/modules/assessment/attempt.model";

const qid = () => new mongoose.Types.ObjectId();

function snap(over: Partial<QuestionSnapshot> = {}): QuestionSnapshot {
  return {
    qId: qid(),
    topicId: qid(),
    lessonId: null,
    type: "mcq_single",
    stemMD: "س؟",
    options: [
      { key: "a", text: "1" },
      { key: "b", text: "2" },
    ],
    correctKeys: ["b"],
    explanationMD: "شرح طويل بما يكفي لاجتياز أي حد أدنى.",
    difficulty: "easy",
    conceptTags: [],
    ...over,
  };
}

describe("gradeAnswers (deterministic, no negative marking)", () => {
  it("marks exact match correct", () => {
    const s = snap();
    const [g] = gradeAnswers(
      [{ qId: s.qId, type: s.type, correctKeys: s.correctKeys }],
      [{ qId: String(s.qId), chosenKeys: ["b"], timeMs: 1200 }],
    );
    expect(g.correct).toBe(true);
    expect(g.skipped).toBe(false);
  });

  it("marks wrong choice incorrect (0, no penalty)", () => {
    const s = snap();
    const [g] = gradeAnswers(
      [{ qId: s.qId, type: s.type, correctKeys: s.correctKeys }],
      [{ qId: String(s.qId), chosenKeys: ["a"], timeMs: 800 }],
    );
    expect(g.correct).toBe(false);
    expect(g.skipped).toBe(false);
  });

  it("flags unanswered as skipped", () => {
    const s = snap();
    const [g] = gradeAnswers(
      [{ qId: s.qId, type: s.type, correctKeys: s.correctKeys }],
      [],
    );
    expect(g.correct).toBe(false);
    expect(g.skipped).toBe(true);
  });

  it("grades from the snapshot even if the bank question changed later", () => {
    // Teacher fixes the question AFTER the attempt started: snapshot still wins.
    const s = snap({ correctKeys: ["b"] });
    const [g] = gradeAnswers(
      [{ qId: s.qId, type: s.type, correctKeys: s.correctKeys }],
      [{ qId: String(s.qId), chosenKeys: ["b"], timeMs: 500 }],
    );
    expect(g.correct).toBe(true);
  });
});

describe("scoreOf", () => {
  it("computes score + rounded accuracy", () => {
    expect(
      scoreOf([
        { qId: "1", chosenKeys: ["a"], correct: true, skipped: false, timeMs: 1 },
        { qId: "2", chosenKeys: ["a"], correct: false, skipped: false, timeMs: 1 },
        { qId: "3", chosenKeys: [], correct: false, skipped: true, timeMs: 0 },
      ]),
    ).toEqual({ score: 1, accuracy: 33 });
  });
});

describe("answer-leak guard", () => {
  it("toPublic strips correct keys and explanations", () => {
    const pub = toPublic([snap()]);
    expect(() => assertNoLeak(pub)).not.toThrow();
    const raw = JSON.stringify(pub);
    expect(raw).not.toContain("correctKeys");
    expect(raw).not.toContain("explanationMD");
  });

  it("assertNoLeak fires on a leaking payload", () => {
    expect(() => assertNoLeak({ correctKeys: ["a"] })).toThrow(/leak/);
    expect(() => assertNoLeak({ explanationMD: "x" })).toThrow(/leak/);
  });
});
