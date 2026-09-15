import mongoose, { Schema, Types } from "mongoose";

/**
 * XPTransaction — append-only ledger (M5, §4.5).
 * Daily cap 600 XP from questions; exam bonus +25 flat.
 */
export interface XPTransactionDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  amount: number;
  reason: "quiz_correct" | "exam_bonus" | "streak_milestone" | "achievement" | "effort";
  refId: string | null;
  balanceAfter: number;
  createdAt: Date;
}

const xpSchema = new Schema<XPTransactionDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, enum: ["quiz_correct", "exam_bonus", "streak_milestone", "achievement", "effort"], required: true },
    refId: { type: String, default: null },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
xpSchema.index({ studentId: 1, createdAt: -1 });

export const XPTransactionModel =
  mongoose.models.XPTransaction ?? mongoose.model<XPTransactionDoc>("XPTransaction", xpSchema);

export const LEVEL_THRESHOLDS = [
  0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400,
]; // L1=0, then +1200/level beyond 10

export function levelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpForNextLevel(xp: number): { level: number; next: number; need: number } {
  const level = levelFromXP(xp);
  if (level < LEVEL_THRESHOLDS.length) return { level, next: LEVEL_THRESHOLDS[level], need: LEVEL_THRESHOLDS[level] - xp };
  const next = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length + 1) * 1200;
  return { level, next, need: next - xp };
}