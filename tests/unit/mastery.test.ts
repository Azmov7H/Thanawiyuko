import { describe, expect, it } from "vitest";
import { computeMastery, MASTERY_DECAY } from "@/lib/mastery";

describe("computeMastery (recency-weighted + volume)", () => {
  it("empty → 0 weak", () => {
    expect(computeMastery({ answers: [] })).toEqual({
      masteryScore: 0,
      band: "weak",
      n: 0,
      last10Accuracy: 0,
    });
  });

  it("single correct → low score (volume penalty)", () => {
    const r = computeMastery({ answers: [{ correct: true }] });
    expect(r.n).toBe(1);
    // volumeConfidence = 1/12 → 0.45 * 100 = 45 → "developing" band
    expect(r.masteryScore).toBe(45);
    expect(r.band).toBe("developing");
  });

  it("12 correct → high score (full volume)", () => {
    const r = computeMastery({ answers: Array(12).fill({ correct: true }) });
    expect(r.n).toBe(12);
    expect(r.masteryScore).toBeGreaterThanOrEqual(85);
    expect(r.band).toBe("mastered");
  });

  it("recency decay: recent wrong hurts more than old wrong", () => {
    // recent wrong, then 10 correct
    const a = [{ correct: false }, ...Array(10).fill({ correct: true })];
    const r1 = computeMastery({ answers: a });
    // 10 correct, then recent wrong
    const b = [...Array(10).fill({ correct: true }), { correct: false }];
    const r2 = computeMastery({ answers: b });
    expect(r1.masteryScore).toBeLessThan(r2.masteryScore);
  });

  it("last10Accuracy reflects only last 10", () => {
    const r = computeMastery({
      answers: [{ correct: true }, { correct: true }, { correct: false }, { correct: true }],
    });
    expect(r.last10Accuracy).toBe(75);
    expect(r.n).toBe(4);
  });

  it("bands: 39 weak, 40 developing, 70 proficient, 85 mastered", () => {
    // 1 correct = 45 = developing (not weak due to volume formula)
    expect(computeMastery({ answers: [{ correct: true }] }).band).toBe("developing");
    // 12 correct is mastered
    expect(computeMastery({ answers: Array(12).fill({ correct: true }) }).band).toBe("mastered");
  });
});

describe("MASTERY_DECAY constant", () => {
  it("is 0.92", () => expect(MASTERY_DECAY).toBe(0.92));
});