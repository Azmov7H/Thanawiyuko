import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Client-side gamification state (synced with server on focus/submit). */
export interface GamificationState {
  xp: number;
  level: number;
  nextLevelXp: number;
  streak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  achievements: string[];
  /** Set from server on login/submit. */
  hydrate: (partial: Partial<GamificationState>) => void;
  /** Optimistic increment (server is authority). */
  addXp: (amount: number) => void;
  incrementStreak: () => void;
  breakStreak: () => void;
  unlockAchievement: (code: string) => void;
}

const LEVEL_THRESHOLDS = [
  0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400,
];

function levelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function xpForNextLevel(xp: number): number {
  const level = levelFromXP(xp);
  if (level < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level];
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length + 1) * 1200;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set) => ({
      xp: 0,
      level: 1,
      nextLevelXp: 200,
      streak: 0,
      longestStreak: 0,
      lastActiveDay: null,
      achievements: [],

      hydrate: (partial) =>
        set((state) => {
          const xp = partial.xp ?? state.xp;
          return {
            ...state,
            ...partial,
            xp,
            level: partial.level ?? levelFromXP(xp),
            nextLevelXp: partial.nextLevelXp ?? xpForNextLevel(xp),
          };
        }),

      addXp: (amount) =>
        set((state) => {
          const xp = state.xp + amount;
          return { xp, level: levelFromXP(xp), nextLevelXp: xpForNextLevel(xp) };
        }),

      incrementStreak: () =>
        set((state) => ({
          streak: state.streak + 1,
          longestStreak: Math.max(state.longestStreak, state.streak + 1),
        })),

      breakStreak: () =>
        set(() => ({
          streak: 0,
        })),

      unlockAchievement: (code) =>
        set((state) => ({
          achievements: state.achievements.includes(code) ? state.achievements : [...state.achievements, code],
        })),
    }),
    { name: "thanawico-gamification" },
  ),
);