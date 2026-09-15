import mongoose, { Schema, Types } from "mongoose";

/**
 * StudyPlan — one active per student per Cairo day (M5).
 * Items embedded with reasons; regen max 3/day (Plus).
 */

export interface PlanItem {
  topicId: Types.ObjectId;
  subjectId: Types.ObjectId;
  action: "practice" | "review" | "lesson";
  minutes: number;
  reason: string;
  qCount?: number;
}

export interface StudyPlanDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  date: string; // YYYY-MM-DD Cairo
  items: PlanItem[];
  status: "active" | "archived" | "done";
  source: "deterministic";
  feedback: Record<string, "easy" | "hard" | "boring">;
}

const itemSchema = new Schema<PlanItem>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    action: { type: String, enum: ["practice", "review", "lesson"], required: true },
    minutes: { type: Number, required: true, min: 5, max: 60 },
    reason: { type: String, required: true, maxlength: 200 },
    qCount: { type: Number, min: 1, max: 50 },
  },
  { _id: false },
);

const planSchema = new Schema<StudyPlanDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    date: { type: String, required: true },
    items: { type: [itemSchema], default: [] },
    status: { type: String, enum: ["active", "archived", "done"], default: "active" },
    source: { type: String, default: "deterministic" },
    feedback: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
planSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const StudyPlanModel =
  mongoose.models.StudyPlan ?? mongoose.model<StudyPlanDoc>("StudyPlan", planSchema);