import mongoose, { Schema, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "welcome",
  "plan_ready",
  "streak_milestone",
  "subscription_event",
  "content_correction",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationStatus = "sent" | "pending" | "failed";
export type NotificationEmailStatus = "none" | "pending" | "sent" | "failed";

export interface NotificationDoc extends mongoose.Document {
  userId: Types.ObjectId;
  type: NotificationType;
  titleAr: string;
  bodyAr: string;
  link: string | null;
  readAt: Date | null;
  status: NotificationStatus;
  emailStatus: NotificationEmailStatus;
  scheduledFor: Date | null;
  sentAt: Date | null;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    titleAr: { type: String, required: true, maxlength: 120 },
    bodyAr: { type: String, required: true, maxlength: 500 },
    link: { type: String, default: null, maxlength: 300 },
    readAt: { type: Date, default: null },
    status: { type: String, enum: ["sent", "pending", "failed"], default: "sent" },
    emailStatus: {
      type: String,
      enum: ["none", "pending", "sent", "failed"],
      default: "none",
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });

export const NotificationModel =
  mongoose.models.Notification ??
  mongoose.model<NotificationDoc>("Notification", notificationSchema);

export interface NotificationPreferenceDoc extends mongoose.Document {
  userId: Types.ObjectId;
  email: boolean;
  push: boolean;
}

const notificationPreferenceSchema = new Schema<NotificationPreferenceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const NotificationPreferenceModel =
  mongoose.models.NotificationPreference ??
  mongoose.model<NotificationPreferenceDoc>("NotificationPreference", notificationPreferenceSchema);