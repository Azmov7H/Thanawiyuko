import mongoose, { Schema, Types } from "mongoose";

export const CONTENT_STATUSES = [
  "draft",
  "review",
  "published",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const base = {
  status: {
    type: String,
    enum: CONTENT_STATUSES,
    default: "draft" as ContentStatus,
    index: true,
  },
  version: { type: Number, default: 1, min: 1 },
};

/* ---------------- Subject ---------------- */

export interface SubjectDoc extends mongoose.Document {
  code: string;
  nameAr: string;
  nameEn: string | null;
  grade: "sec1" | "sec2" | "sec3";
  tracks: string[];
  examWeight: number;
  status: ContentStatus;
  version: number;
}

const subjectSchema = new Schema<SubjectDoc>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    nameAr: { type: String, required: true, maxlength: 80 },
    nameEn: { type: String, default: null, maxlength: 80 },
    grade: { type: String, enum: ["sec1", "sec2", "sec3"], required: true },
    tracks: [{ type: String }],
    examWeight: { type: Number, default: 10, min: 1, max: 100 },
    ...base,
  },
  { timestamps: true },
);
subjectSchema.index({ grade: 1, status: 1 });

export const SubjectModel =
  mongoose.models.Subject ??
  mongoose.model<SubjectDoc>("Subject", subjectSchema);

/* ---------------- Unit ---------------- */

export interface UnitDoc extends mongoose.Document {
  subjectId: Types.ObjectId;
  titleAr: string;
  order: number;
  status: ContentStatus;
  version: number;
}

const unitSchema = new Schema<UnitDoc>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    titleAr: { type: String, required: true, maxlength: 120 },
    order: { type: Number, required: true, min: 1 },
    ...base,
  },
  { timestamps: true },
);
unitSchema.index({ subjectId: 1, order: 1 }, { unique: true });

export const UnitModel =
  mongoose.models.Unit ?? mongoose.model<UnitDoc>("Unit", unitSchema);

/* ---------------- Topic (mastery grain, §4.7) ---------------- */

export interface TopicDoc extends mongoose.Document {
  subjectId: Types.ObjectId;
  unitId: Types.ObjectId;
  titleAr: string;
  objectives: string[];
  conceptTags: string[];
  order: number;
  status: ContentStatus;
  version: number;
}

const topicSchema = new Schema<TopicDoc>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    titleAr: { type: String, required: true, maxlength: 120 },
    objectives: [{ type: String, maxlength: 200 }],
    conceptTags: [{ type: String, maxlength: 60 }],
    order: { type: Number, required: true, min: 1 },
    ...base,
  },
  { timestamps: true },
);
topicSchema.index({ unitId: 1, order: 1 }, { unique: true });
topicSchema.index({ subjectId: 1, status: 1 });

export const TopicModel =
  mongoose.models.Topic ?? mongoose.model<TopicDoc>("Topic", topicSchema);

/* ---------------- Lesson (text-first, §4.3) ---------------- */

export interface LessonDoc extends mongoose.Document {
  topicId: Types.ObjectId;
  titleAr: string;
  bodyMD: string;
  diagrams: string[];
  videoUrl: string | null;
  readingMinutes: number;
  order: number;
  status: ContentStatus;
  version: number;
}

const lessonSchema = new Schema<LessonDoc>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    titleAr: { type: String, required: true, maxlength: 140 },
    bodyMD: { type: String, required: true },
    diagrams: [{ type: String }],
    videoUrl: { type: String, default: null },
    readingMinutes: { type: Number, default: 10, min: 1, max: 120 },
    order: { type: Number, required: true, min: 1 },
    ...base,
  },
  { timestamps: true },
);
lessonSchema.index({ topicId: 1, order: 1 }, { unique: true });
lessonSchema.index({ topicId: 1, status: 1 });

export const LessonModel =
  mongoose.models.Lesson ?? mongoose.model<LessonDoc>("Lesson", lessonSchema);
