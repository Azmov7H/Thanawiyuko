import mongoose, { Schema, Types } from "mongoose";
import { CONTENT_STATUSES, type ContentStatus } from "../academic/content.models";

/**
 * Exam — a timed mock definition (M4). Published exams are immutable in
 * spirit: edits bump `version`; attempts snapshot everything they need.
 */

export interface BlueprintRow {
  topicId: Types.ObjectId;
  count: number;
}

export interface ExamDoc extends mongoose.Document {
  titleAr: string;
  description: string | null;
  grade: "sec1" | "sec2" | "sec3";
  /** null = all streams (e.g. shared Arabic mock). */
  track: "general" | "science" | "math" | "literary" | null;
  subjectId: Types.ObjectId | null;
  durationMin: number;
  attemptsAllowed: number;
  blueprint: BlueprintRow[];
  status: ContentStatus;
  version: number;
}

const blueprintSchema = new Schema<BlueprintRow>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    count: { type: Number, required: true, min: 1, max: 100 },
  },
  { _id: false },
);

const examSchema = new Schema<ExamDoc>(
  {
    titleAr: { type: String, required: true, maxlength: 140 },
    description: { type: String, default: null, maxlength: 500 },
    grade: { type: String, enum: ["sec1", "sec2", "sec3"], required: true },
    track: {
      type: String,
      enum: ["general", "science", "math", "literary"],
      default: null,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", default: null },
    durationMin: { type: Number, required: true, min: 5, max: 240 },
    attemptsAllowed: { type: Number, required: true, default: 2, min: 1, max: 10 },
    blueprint: { type: [blueprintSchema], required: true },
    status: { type: String, enum: CONTENT_STATUSES, default: "draft" },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);
examSchema.index({ grade: 1, track: 1, status: 1 });
examSchema.index({ subjectId: 1, status: 1 });

export const ExamModel =
  mongoose.models.Exam ?? mongoose.model<ExamDoc>("Exam", examSchema);
