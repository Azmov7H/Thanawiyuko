import mongoose, { Schema } from "mongoose";

export type UserRole = "student" | "admin" | "super";

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "suspended" | "deleted";
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
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);
