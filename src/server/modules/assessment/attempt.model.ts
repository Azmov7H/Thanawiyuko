import mongoose, { Schema, Types } from "mongoose";

/**
 * Attempt — one scored practice/quiz event (M3). Immutable after submit.
 * Question content is snapshotted at start so later content edits
 * never rewrite history (§4.11).
 */

export interface SnapshotOption {
  key: string;
  text: string;
}

export interface QuestionSnapshot {
  qId: Types.ObjectId;
  topicId: Types.ObjectId;
  lessonId: Types.ObjectId | null;
  type: "mcq_single" | "true_false";
  stemMD: string;
  /** Shuffled per attempt — order here is what the student saw. */
  options: SnapshotOption[];
  correctKeys: string[];
  explanationMD: string;
  difficulty: "easy" | "medium" | "hard";
  /** Copied at start for post-submit analysis (M4). */
  conceptTags: string[];
}

export interface AttemptAnswer {
  qId: Types.ObjectId;
  chosenKeys: string[];
  correct: boolean;
  skipped: boolean;
  checked: boolean;
  timeMs: number;
}

export interface AttemptDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  userId: Types.ObjectId;
  kind: "practice" | "quiz" | "exam" | "diagnostic";
  clientAttemptId: string;
  status: "in_progress" | "submitted";
  shuffleSeed: number;
  scope: { subjectId?: Types.ObjectId; topicId?: Types.ObjectId };
  snapshots: QuestionSnapshot[];
  answers: AttemptAnswer[];
  score: number;
  total: number;
  accuracy: number;
  startedAt: Date;
  submittedAt: Date | null;
  /* Exam-mode extensions (M4, all optional — practice attempts ignore them). */
  examId: Types.ObjectId | null;
  /** Server-authoritative deadline (startedAt + duration). Client timer is display-only. */
  deadlineAt: Date | null;
  lateSubmit: boolean;
  flaggedQIds: string[];
  /** Tab-switch count: logged as integrity signal, never punished (MVP, §22). */
  tabSwitches: number;
}

const optionSchema = new Schema<SnapshotOption>(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const snapshotSchema = new Schema<QuestionSnapshot>(
  {
    qId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", default: null },
    type: { type: String, enum: ["mcq_single", "true_false"], required: true },
    stemMD: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctKeys: [{ type: String, required: true }],
    explanationMD: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    conceptTags: [{ type: String, default: [] }],
  },
  { _id: false },
);

const answerSchema = new Schema<AttemptAnswer>(
  {
    qId: { type: Schema.Types.ObjectId, required: true },
    chosenKeys: [{ type: String }],
    correct: { type: Boolean, required: true, default: false },
    skipped: { type: Boolean, required: true, default: false },
    checked: { type: Boolean, required: true, default: false },
    timeMs: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const attemptSchema = new Schema<AttemptDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: ["practice", "quiz", "exam", "diagnostic"],
      default: "practice",
    },
    clientAttemptId: { type: String, required: true },
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
    shuffleSeed: { type: Number, required: true },
    scope: {
      subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
      topicId: { type: Schema.Types.ObjectId, ref: "Topic" },
    },
    snapshots: { type: [snapshotSchema], required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    total: { type: Number, required: true },
    accuracy: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", default: null },
    deadlineAt: { type: Date, default: null },
    lateSubmit: { type: Boolean, default: false },
    flaggedQIds: [{ type: String, default: [] }],
    tabSwitches: { type: Number, default: 0, min: 0 },
  },
  { timestamps: false },
);
attemptSchema.index({ userId: 1, clientAttemptId: 1 }, { unique: true });
attemptSchema.index({ userId: 1, startedAt: -1 });
attemptSchema.index({ userId: 1, status: 1 });
attemptSchema.index({ examId: 1, userId: 1, status: 1 });

export const AttemptModel =
  mongoose.models.Attempt ??
  mongoose.model<AttemptDoc>("Attempt", attemptSchema);
