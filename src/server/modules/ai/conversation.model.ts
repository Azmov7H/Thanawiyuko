import mongoose, { Schema, Types } from "mongoose";

/**
 * AIConversation — per-student chat threads (M6).
 * Messages embedded, capped at 200; older ones auto-archived (not implemented in MVP).
 */
export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: Date;
  feedback?: "helpful" | "not_helpful";
  cached: boolean;
}

export interface AIConversationDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  topicId: Types.ObjectId | null;
  title: string;
  messages: AiMessage[];
  quotaPeriod: Date; // Cairo day start
  quota: { limit: number; used: number };
  status: "active" | "archived";
}

const messageSchema = new Schema<AiMessage>(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    model: { type: String, required: true },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    feedback: { type: String, enum: ["helpful", "not_helpful"] },
    cached: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
);

const conversationSchema = new Schema<AIConversationDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", default: null },
    title: { type: String, maxlength: 120 },
    messages: { type: [messageSchema], default: [] },
    quotaPeriod: { type: Date, required: true },
    quota: { limit: { type: Number, required: true }, used: { type: Number, default: 0 } },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true },
);
conversationSchema.index({ studentId: 1, quotaPeriod: -1 });
conversationSchema.index({ studentId: 1, topicId: 1 });

export const AIConversationModel =
  mongoose.models.AIConversation ??
  mongoose.model<AIConversationDoc>("AIConversation", conversationSchema);