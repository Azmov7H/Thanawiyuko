import mongoose, { Schema, Types } from "mongoose";

export interface OnboardingState {
  step: number;
  done: boolean;
}

export interface StudentProfileDoc extends mongoose.Document {
  userId: Types.ObjectId;
  grade: "sec1" | "sec2" | "sec3" | null;
  track: "general" | "science" | "math" | "literary" | null;
  dailyMinutes: number;
  targetExamDate: Date | null;
  onboardingState: OnboardingState;
}

const profileSchema = new Schema<StudentProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    grade: { type: String, enum: ["sec1", "sec2", "sec3"], default: null },
    track: {
      type: String,
      enum: ["general", "science", "math", "literary"],
      default: null,
    },
    dailyMinutes: { type: Number, default: 45, min: 10, max: 240 },
    targetExamDate: { type: Date, default: null },
    onboardingState: {
      step: { type: Number, default: 1 },
      done: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const StudentProfileModel =
  mongoose.models.StudentProfile ??
  mongoose.model<StudentProfileDoc>("StudentProfile", profileSchema);
