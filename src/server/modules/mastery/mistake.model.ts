import mongoose, { Schema, Types } from "mongoose";

/**
 * Mistake — spaced-review queue (SM-2 lite: +1d/+3d/+7d from first failure).
 * Created on incorrect, resolved after 2 consecutive correct reviews.
 */

export interface MistakeDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  topicId: Types.ObjectId;
  questionId: Types.ObjectId;
  conceptTag: string | null;
  chosenKeys: string[];
  correctKeys: string[];
  /** SM-2 intervals: 1d, 3d, 7d, then 14d, 30d... capped at 30d. */
  dueAt: Date;
  reviewCount: number;
  consecutiveCorrect: number;
  resolvedAt: Date | null;
  lastReviewAt: Date | null;
}

const mistakeSchema = new Schema<MistakeDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    conceptTag: { type: String, default: null, maxlength: 60 },
    chosenKeys: [{ type: String }],
    correctKeys: [{ type: String }],
    dueAt: { type: Date, required: true },
    reviewCount: { type: Number, default: 0, min: 0 },
    consecutiveCorrect: { type: Number, default: 0, min: 0 },
    resolvedAt: { type: Date, default: null },
    lastReviewAt: { type: Date, default: null },
  },
  { timestamps: true },
);
mistakeSchema.index({ studentId: 1, dueAt: 1 });
mistakeSchema.index({ studentId: 1, topicId: 1 });

export const MistakeModel =
  mongoose.models.Mistake ?? mongoose.model<MistakeDoc>("Mistake", mistakeSchema);

/** SM-2 intervals in days. */
export const MISTAKE_INTERVALS = [1, 3, 7, 14, 30];

/** Next dueAt from now, given reviewCount (index into MISTAKE_INTERVALS, capped). */
export function nextDueAt(reviewCount: number): Date {
  const days = MISTAKE_INTERVALS[Math.min(reviewCount, MISTAKE_INTERVALS.length - 1)];
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}