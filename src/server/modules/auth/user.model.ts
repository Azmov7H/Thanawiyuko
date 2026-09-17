import mongoose, { Schema } from "mongoose";

export type UserRole = "student" | "admin" | "super";

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "suspended" | "deletion_pending" | "deleted";
  guardianConsentAt: Date | null;
  deletionRequestedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "admin", "super"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deletion_pending", "deleted"],
      default: "active",
    },
    guardianConsentAt: { type: Date, default: null },
    deletionRequestedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);
