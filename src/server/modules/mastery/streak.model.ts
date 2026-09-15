import mongoose, { Schema, Types } from "mongoose";

/**
 * Streak — per-student streak state (M5, §4.6).
 * Qualifying activity: ≥5 questions answered OR exam submitted OR 15min study + 3Q.
 * Daily job reconciles at 00:00 Cairo.
 */
export interface StreakDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  current: number;
  longest: number;
  lastActiveDay: string; // YYYY-MM-DD (Cairo)
  history: string[];     // last 60 days
}

const streakSchema = new Schema<StreakDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, unique: true },
    current: { type: Number, default: 0, min: 0 },
    longest: { type: Number, default: 0, min: 0 },
    lastActiveDay: { type: String, default: null },
    history: [{ type: String }],
  },
  { timestamps: true },
);

export const StreakModel =
  mongoose.models.Streak ?? mongoose.model<StreakDoc>("Streak", streakSchema);