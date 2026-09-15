import mongoose, { Schema, Types } from "mongoose";

export interface AuditLogDoc extends mongoose.Document {
  actorId: Types.ObjectId;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  at: Date;
}

const auditSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, maxlength: 60 },
    entity: { type: String, required: true, maxlength: 40 },
    entityId: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: { createdAt: "at", updatedAt: false } },
);
auditSchema.index({ entity: 1, entityId: 1 });
auditSchema.index({ actorId: 1, at: -1 });

export const AuditLogModel =
  mongoose.models.AuditLog ??
  mongoose.model<AuditLogDoc>("AuditLog", auditSchema);
