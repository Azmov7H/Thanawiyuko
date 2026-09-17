import mongoose, { Schema, Types } from "mongoose";

/**
 * TopicMastery — per (student, topic) diagnosis state (§4.7).
 * masteryScore ∈ [0,100] from recency-weighted accuracy × volume confidence.
 */
export interface TopicMasteryDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  topicId: Types.ObjectId;
  masteryScore: number;
  band: "weak" | "developing" | "proficient" | "mastered";
  n: number;
  last10Accuracy: number;
  recent: boolean[];
  updatedAt: Date;
}

const masterySchema = new Schema<TopicMasteryDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    masteryScore: { type: Number, required: true, default: 0, min: 0, max: 100 },
    band: {
      type: String,
      enum: ["weak", "developing", "proficient", "mastered"],
      default: "weak",
    },
    n: { type: Number, required: true, default: 0, min: 0 },
    last10Accuracy: { type: Number, required: true, default: 0, min: 0, max: 100 },
    recent: { type: [Boolean], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);
masterySchema.index({ studentId: 1, topicId: 1 }, { unique: true });

export const TopicMasteryModel =
  mongoose.models.TopicMastery ??
  mongoose.model<TopicMasteryDoc>("TopicMastery", masterySchema);