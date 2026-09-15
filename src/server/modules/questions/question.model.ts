import mongoose, { Schema, Types } from "mongoose";
import { CONTENT_STATUSES, type ContentStatus } from "../academic/content.models";

export const QUESTION_TYPES = ["mcq_single", "true_false"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface QuestionOption {
  key: string;
  text: string;
  rationale: string | null;
}

export interface QuestionDoc extends mongoose.Document {
  topicId: Types.ObjectId;
  lessonId: Types.ObjectId | null;
  type: QuestionType;
  stemMD: string;
  options: QuestionOption[];
  correctKeys: string[];
  /** Mandatory — no question ships without an explanation (§20, M2 gate). */
  explanationMD: string;
  difficulty: Difficulty;
  difficultyEstimated: boolean;
  conceptTags: string[];
  objectives: string[];
  source: string | null;
  estMinutes: number;
  stats: { attempts: number; correct: number };
  status: ContentStatus;
  version: number;
}

const optionSchema = new Schema<QuestionOption>(
  {
    key: { type: String, required: true, maxlength: 4 },
    text: { type: String, required: true, maxlength: 500 },
    rationale: { type: String, default: null, maxlength: 300 },
  },
  { _id: false },
);

const questionSchema = new Schema<QuestionDoc>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", default: null },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    stemMD: { type: String, required: true },
    options: { type: [optionSchema], required: true, validate: [(v: unknown[]) => v.length >= 2, "سؤال يحتاج خيارين على الأقل"] },
    correctKeys: [{ type: String, required: true }],
    explanationMD: {
      type: String,
      required: [true, "الشرح إجباري — لا يُنشر سؤال بدون شرح"],
      minlength: [20, "الشرح قصير جدًا"],
    },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    difficultyEstimated: { type: Boolean, default: true },
    conceptTags: [{ type: String, maxlength: 60 }],
    objectives: [{ type: String, maxlength: 200 }],
    source: { type: String, default: null },
    estMinutes: { type: Number, default: 2, min: 1, max: 30 },
    stats: {
      attempts: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
    },
    status: { type: String, enum: CONTENT_STATUSES, default: "draft" },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);
questionSchema.index({ topicId: 1, difficulty: 1, status: 1 });
questionSchema.index({ conceptTags: 1 });

export const QuestionModel =
  mongoose.models.Question ??
  mongoose.model<QuestionDoc>("Question", questionSchema);
