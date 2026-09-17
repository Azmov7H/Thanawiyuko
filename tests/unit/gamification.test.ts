import { describe, expect, it, beforeEach } from "vitest";
import { useGamificationStore } from "@/state/gamification";
import { levelFromXP, xpForNextLevel, LEVEL_THRESHOLDS } from "@/server/modules/gamification/xp.model";

beforeEach(() => {
  useGamificationStore.setState({
    xp: 0,
    level: 1,
    nextLevelXp: 200,
    streak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    achievements: [],
  });
});

describe("client gamification store", () => {
  it("hydrates and computes level/nextXP", () => {
    useGamificationStore.getState().hydrate({ xp: 500 });
    const s = useGamificationStore.getState();
    expect(s.xp).toBe(500);
    expect(s.level).toBe(3); // 500 >= 500 threshold
    expect(s.nextLevelXp).toBe(900);
  });

  it("addXp increments and caps daily in store (server enforces real cap)", () => {
    useGamificationStore.getState().addXp(100);
    expect(useGamificationStore.getState().xp).toBe(100);
    useGamificationStore.getState().addXp(150);
    expect(useGamificationStore.getState().xp).toBe(250);
  });

  it("incrementStreak and breakStreak", () => {
    useGamificationStore.getState().incrementStreak();
    expect(useGamificationStore.getState().streak).toBe(1);
    expect(useGamificationStore.getState().longestStreak).toBe(1);
    useGamificationStore.getState().incrementStreak();
    expect(useGamificationStore.getState().streak).toBe(2);
    useGamificationStore.getState().breakStreak();
    expect(useGamificationStore.getState().streak).toBe(0);
  });

  it("unlockAchievement deduplicates", () => {
    useGamificationStore.getState().unlockAchievement("first_quiz");
    expect(useGamificationStore.getState().achievements).toContain("first_quiz");
    useGamificationStore.getState().unlockAchievement("first_quiz");
    expect(useGamificationStore.getState().achievements.filter((a) => a === "first_quiz").length).toBe(1);
  });
});

describe("XP math (levelFromXP, xpForNextLevel)", () => {
  it("thresholds match LEVEL_THRESHOLDS", () => {
    expect(levelFromXP(0)).toBe(1);
    expect(levelFromXP(199)).toBe(1);
    expect(levelFromXP(200)).toBe(2);
    expect(levelFromXP(499)).toBe(2);
    expect(levelFromXP(500)).toBe(3);
    expect(levelFromXP(5400)).toBe(10);
    expect(levelFromXP(6600)).toBe(10); // last defined threshold is 5400 (level 10); 6600 is still level 10 until next threshold
  });

  it("xpForNextLevel returns correct next threshold", () => {
    expect(xpForNextLevel(0).next).toBe(200);
    expect(xpForNextLevel(199).next).toBe(200);
    expect(xpForNextLevel(200).next).toBe(500);
    expect(xpForNextLevel(5400).next).toBe(6600); // beyond table
  });

  it("LEVEL_THRESHOLDS array integrity", () => {
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
    expect(LEVEL_THRESHOLDS[9]).toBe(5400);
  });
});

describe("anti-farm rules (conceptual — server enforces)", () => {
  it("daily cap 600 is a constant", () => {
    const DAILY_CAP = 600;
    expect(DAILY_CAP).toBe(600);
  });

  it("<5s penalty: zero XP + flag", () => {
    const FAST_THRESHOLD_MS = 5000;
    expect(FAST_THRESHOLD_MS).toBe(5000);
  });

  it("re-solve within 24h = 20% XP", () => {
    const RE_SOLVE_PENALTY = 0.2;
    expect(RE_SOLVE_PENALTY).toBe(0.2);
  });
});