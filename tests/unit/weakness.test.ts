import { describe, expect, it } from "vitest";
import {
  WEAK_MIN_N,
  isWeakTopic,
  weakTopicScore,
} from "@/lib/weakness";

describe("isWeakTopic (§4.7)", () => {
  const base = { masteryScore: 80, n: 10, last10Accuracy: 90, conceptRepeatCount: 0 };

  it("weak when mastery < 50 and n >= 5", () => {
    expect(isWeakTopic({ ...base, masteryScore: 49 })).toBe(true);
    expect(isWeakTopic({ ...base, masteryScore: 50 })).toBe(false);
  });

  it("not weak on low mastery without enough volume", () => {
    expect(isWeakTopic({ ...base, masteryScore: 10, n: WEAK_MIN_N - 1 })).toBe(false);
  });

  it("weak when last-10 accuracy < 50 and n >= 5", () => {
    expect(isWeakTopic({ ...base, last10Accuracy: 40 })).toBe(true);
    expect(isWeakTopic({ ...base, last10Accuracy: 50 })).toBe(false);
    expect(isWeakTopic({ ...base, last10Accuracy: 10, n: 4 })).toBe(false);
  });

  it("weak on repeated concept mistakes regardless of mastery", () => {
    expect(isWeakTopic({ ...base, conceptRepeatCount: 2 })).toBe(true);
    expect(isWeakTopic({ ...base, conceptRepeatCount: 1 })).toBe(false);
  });
});

describe("weakTopicScore", () => {
  it("is examWeight × gap, so high-weight weak topics rank first", () => {
    expect(weakTopicScore({ masteryScore: 30, examWeight: 20 })).toBe(1400);
    expect(
      weakTopicScore({ masteryScore: 60, examWeight: 20 }) >
        weakTopicScore({ masteryScore: 30, examWeight: 10 }),
    ).toBe(true);
  });
});
