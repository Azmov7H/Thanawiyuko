import mongoose, { Schema, Types } from "mongoose";

/**
 * StudySession — one row per (student, lesson, Cairo day).
 * Lesson completion logs here but grants no mastery (§4.3).
 */

export interface StudySessionDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  lessonId: Types.ObjectId;
  topicId: Types.ObjectId;
  subjectId: Types.ObjectId;
  date: string; // YYYY-MM-DD Cairo
  minutes: number;
  completedAt: Date | null;
}

const studySessionSchema = new Schema<StudySessionDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: String, required: true },
    minutes: { type: Number, default: 0, min: 0, max: 240 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
studySessionSchema.index({ studentId: 1, lessonId: 1, date: 1 }, { unique: true });
studySessionSchema.index({ studentId: 1, createdAt: -1 });

export const StudySessionModel =
  mongoose.models.StudySession ??
  mongoose.model<StudySessionDoc>("StudySession", studySessionSchema);
