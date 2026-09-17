import mongoose, { Schema } from "mongoose";

/** Plan catalog — DB-driven pricing/features (T-F1). */
export interface PlanDoc extends mongoose.Document {
  key: string;
  nameAr: string;
  nameEn: string;
  priceEGP: number;
  durationDays: number;
  popular: boolean;
  features: string[];
  order: number;
  active: boolean;
}

const planSchema = new Schema<PlanDoc>(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    nameAr: { type: String, required: true, trim: true, maxlength: 80 },
    nameEn: { type: String, required: true, trim: true, maxlength: 80 },
    priceEGP: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    popular: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
planSchema.index({ active: 1, order: 1 });

export const PlanModel =
  mongoose.models.Plan ?? mongoose.model<PlanDoc>("Plan", planSchema);
