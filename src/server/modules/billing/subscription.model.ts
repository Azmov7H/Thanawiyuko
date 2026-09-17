import mongoose, { Schema, Types } from "mongoose";

/** Subscription — entitlement state (M8). */
export interface SubscriptionDoc extends mongoose.Document {
  studentId: Types.ObjectId;
  tier: "free" | "plus";
  plan: "monthly" | "semester" | "annual" | null;
  status: "pending" | "active" | "grace" | "past_due" | "cancelled";
  provider: "paymob" | "manual";
  providerRef: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
}

const subscriptionSchema = new Schema<SubscriptionDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, unique: true },
    tier: { type: String, enum: ["free", "plus"], default: "free" },
    plan: { type: String, enum: ["monthly", "semester", "annual"], default: null },
    status: { type: String, enum: ["pending", "active", "grace", "past_due", "cancelled"], default: "pending" },
    provider: { type: String, enum: ["paymob", "manual"], default: "paymob" },
    providerRef: { type: String, default: null },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);
subscriptionSchema.index({ studentId: 1 });
subscriptionSchema.index({ providerRef: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const SubscriptionModel =
  mongoose.models.Subscription ?? mongoose.model<SubscriptionDoc>("Subscription", subscriptionSchema);

/** Payment — money trail (M8). */
export interface PaymentDoc extends mongoose.Document {
  subscriptionId: Types.ObjectId;
  studentId: Types.ObjectId;
  amountEGP: number;
  currency: string;
  provider: "paymob" | "fawry" | "manual";
  providerRef: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  rawWebhookId: string | null;
  refundedAt: Date | null;
  refundReason: string | null;
  refundedBy: Types.ObjectId | null;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    amountEGP: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EGP" },
    provider: { type: String, enum: ["paymob", "fawry", "manual"], default: "paymob" },
    providerRef: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], default: "pending" },
    rawWebhookId: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    refundReason: { type: String, default: null, maxlength: 300 },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
paymentSchema.index({ subscriptionId: 1, createdAt: -1 });
paymentSchema.index({ providerRef: 1 }, { unique: true });
paymentSchema.index({ studentId: 1, status: 1 });

export const PaymentModel =
  mongoose.models.Payment ?? mongoose.model<PaymentDoc>("Payment", paymentSchema);