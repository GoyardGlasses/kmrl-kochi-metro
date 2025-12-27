import mongoose, { Schema, Document } from "mongoose";

export type AuditAction = "UPDATE_DECISION" | "SIMULATE" | "MAXIMO_JOB_CARDS_IMPORT" | "FITNESS_IMPORT" | "UNS_FITNESS_IMPORT";

export interface AuditLogDocument extends Document {
  action: AuditAction;
  actorEmail?: string;
  actorId?: string;
  trainsetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: { type: String, enum: ["UPDATE_DECISION", "SIMULATE", "MAXIMO_JOB_CARDS_IMPORT", "FITNESS_IMPORT", "UNS_FITNESS_IMPORT"], required: true, index: true },
    actorEmail: { type: String, index: true },
    actorId: { type: String, index: true },
    trainsetId: { type: String, index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
