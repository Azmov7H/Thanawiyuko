import mongoose, { Schema, Types } from "mongoose";

export interface TeacherProfileDoc extends mongoose.Document {
  userId: Types.ObjectId;
  headline: string;
  bio: string;
  subjectAreas: string[];
  isPublic: boolean;
}

const teacherProfileSchema = new Schema<TeacherProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    headline: { type: String, default: "", maxlength: 120, trim: true },
    bio: { type: String, default: "", maxlength: 2000, trim: true },
    subjectAreas: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const TeacherProfileModel =
  mongoose.models.TeacherProfile ??
  mongoose.model<TeacherProfileDoc>("TeacherProfile", teacherProfileSchema);