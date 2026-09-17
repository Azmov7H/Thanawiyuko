import { describe, expect, it } from "vitest";
import { computeReadiness } from "@/lib/readiness";
import { buildRecommendations } from "@/lib/recommendations";

describe("computeReadiness (§4.4)", () => {
  it("returns 0 with no topics", () => {
    expect(computeReadiness([], new Map())).toBe(0);
  });

  it("weights topics within a subject by volume", () => {
    const readiness = computeReadiness(
      [
        { subjectId: "s1", masteryScore: 100, weight: 1 },
        { subjectId: "s1", masteryScore: 0, weight: 1 },
      ],
      new Map([["s1", 10]]),
    );
    expect(readiness).toBe(50);
  });

  it("weights subjects by exam weight", () => {
    const readiness = computeReadiness(
      [
        { subjectId: "s1", masteryScore: 100, weight: 10 },
        { subjectId: "s2", masteryScore: 0, weight: 10 },
      ],
      new Map([
        ["s1", 30],
        ["s2", 10],
      ]),
    );
    expect(readiness).toBe(75);
  });

  it("treats topics with zero volume as zero mastery", () => {
    const readiness = computeReadiness(
      [
        { subjectId: "s1", masteryScore: 80, weight: 0 },
        { subjectId: "s2", masteryScore: 80, weight: 5 },
      ],
      new Map([
        ["s1", 10],
        ["s2", 10],
      ]),
    );
    expect(readiness).toBe(40);
  });
});

describe("buildRecommendations (§4.14)", () => {
  const base = {
    mistakesDue: 0,
    weakestTopic: null,
    lessonForRepeatedMistake: null,
    readiness: 90,
    daysToExam: 120,
  };

  it("ranks review → weakest quiz → lesson, capped at 3", () => {
    const next = buildRecommendations({
      ...base,
      mistakesDue: 4,
      weakestTopic: { topicId: "t1", subjectId: "s1", masteryScore: 22 },
      lessonForRepeatedMistake: { lessonId: "l1", conceptTag: "newton" },
      readiness: 35,
      daysToExam: 20,
    });
    expect(next.map((r) => r.type)).toEqual(["review", "quiz", "lesson"]);
    expect(next[0].href).toBe("/mistakes");
    expect(next[1].href).toBe("/subjects/s1");
    expect(next[2].href).toBe("/lessons/l1");
    expect(next[2].reason).toContain("newton");
  });

  it("adds a mini-mock only when readiness < 60 and exam < 45d", () => {
    expect(buildRecommendations({ ...base, readiness: 50, daysToExam: 30 }).map((r) => r.type)).toEqual(["mock"]);
    expect(buildRecommendations({ ...base, readiness: 70, daysToExam: 30 })).toEqual([]);
    expect(buildRecommendations({ ...base, readiness: 50, daysToExam: 60 })).toEqual([]);
  });

  it("returns nothing for a ready, unencumbered student", () => {
    expect(buildRecommendations(base)).toEqual([]);
  });
});
