import { describe, expect, it } from "vitest";
import {
  XP_DAILY_CAP,
  EXAM_BONUS_XP,
  EFFORT_XP,
  FAST_ANSWER_MS,
  RE_SOLVE_PENALTY,
  DIFFICULTY_MULTIPLIER,
  baseCorrectXp,
  answerXp,
  applyDailyCap,
  isStreakQualifying,
} from "@/lib/learning";

describe("XP constants", () => {
  it("match the normative spec", () => {
    expect(XP_DAILY_CAP).toBe(600);
    expect(EXAM_BONUS_XP).toBe(25);
    expect(EFFORT_XP).toBe(2);
    expect(FAST_ANSWER_MS).toBe(5000);
    expect(RE_SOLVE_PENALTY).toBe(0.2);
    expect(DIFFICULTY_MULTIPLIER).toEqual({ easy: 1, medium: 1.25, hard: 1.5 });
  });
});

describe("baseCorrectXp", () => {
  it("applies difficulty multiplier and rounds", () => {
    expect(baseCorrectXp("easy")).toBe(10);
    expect(baseCorrectXp("medium")).toBe(13);
    expect(baseCorrectXp("hard")).toBe(15);
  });
});

describe("answerXp", () => {
  it("awards base XP for a correct slow answer", () => {
    expect(answerXp({ difficulty: "easy", correct: true, timeMs: 6000, firstAttempt: true, repeatedWithin24h: false })).toBe(10);
    expect(answerXp({ difficulty: "medium", correct: true, timeMs: 6000, firstAttempt: true, repeatedWithin24h: false })).toBe(13);
    expect(answerXp({ difficulty: "hard", correct: true, timeMs: 6000, firstAttempt: true, repeatedWithin24h: false })).toBe(15);
  });

  it("time gate: <5s on medium/hard = 0, easy unaffected", () => {
    expect(answerXp({ difficulty: "medium", correct: true, timeMs: 4999, firstAttempt: true, repeatedWithin24h: false })).toBe(0);
    expect(answerXp({ difficulty: "hard", correct: true, timeMs: 1000, firstAttempt: true, repeatedWithin24h: false })).toBe(0);
    expect(answerXp({ difficulty: "easy", correct: true, timeMs: 1000, firstAttempt: true, repeatedWithin24h: false })).toBe(10);
  });

  it("duplicate penalty: correct within 24h = 20%", () => {
    expect(answerXp({ difficulty: "easy", correct: true, timeMs: 6000, firstAttempt: false, repeatedWithin24h: true })).toBe(2);
    expect(answerXp({ difficulty: "medium", correct: true, timeMs: 6000, firstAttempt: false, repeatedWithin24h: true })).toBe(3);
    expect(answerXp({ difficulty: "hard", correct: true, timeMs: 6000, firstAttempt: false, repeatedWithin24h: true })).toBe(3);
  });

  it("effort XP only on the first incorrect attempt", () => {
    expect(answerXp({ difficulty: "easy", correct: false, timeMs: 6000, firstAttempt: true, repeatedWithin24h: false })).toBe(2);
    expect(answerXp({ difficulty: "hard", correct: false, timeMs: 6000, firstAttempt: false, repeatedWithin24h: false })).toBe(0);
  });
});

describe("applyDailyCap", () => {
  it("caps at the daily limit", () => {
    expect(applyDailyCap(100, 0)).toBe(100);
    expect(applyDailyCap(100, 550)).toBe(50);
    expect(applyDailyCap(100, 600)).toBe(0);
    expect(applyDailyCap(0, 10)).toBe(0);
  });
});

describe("isStreakQualifying", () => {
  it("qualifies on >=5 questions or an exam submit", () => {
    expect(isStreakQualifying({ questionsAnswered: 5, examSubmitted: false })).toBe(true);
    expect(isStreakQualifying({ questionsAnswered: 4, examSubmitted: true })).toBe(true);
    expect(isStreakQualifying({ questionsAnswered: 4, examSubmitted: false })).toBe(false);
  });

  it("qualifies on 15 min study + >=3 questions", () => {
    expect(isStreakQualifying({ questionsAnswered: 3, examSubmitted: false, studyMinutes: 15 })).toBe(true);
    expect(isStreakQualifying({ questionsAnswered: 2, examSubmitted: false, studyMinutes: 30 })).toBe(false);
  });
});
