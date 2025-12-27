import mongoose, { Schema, Document } from "mongoose";

export type InductionDecision = "REVENUE" | "STANDBY" | "IBL";

export interface InductionRunItem {
  trainsetId: string;
  decision: InductionDecision;
  score: number;
  reasons: string[];
  blockers: string[];
  metadata?: any;
}

export interface InductionRunDocument extends Document {
  runId: string;
  createdAt: Date;
  createdBy?: string;
  rule: "OPTION_B";
  results: InductionRunItem[];
  counts: {
    revenue: number;
    standby: number;
    ibl: number;
  };
}

const inductionRunItemSchema = new Schema<InductionRunItem>(
  {
    trainsetId: { type: String, required: true, index: true },
    decision: { type: String, enum: ["REVENUE", "STANDBY", "IBL"], required: true, index: true },
    score: { type: Number, required: true },
    reasons: [{ type: String }],
    blockers: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const inductionRunSchema = new Schema<InductionRunDocument>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    createdBy: { type: String },
    rule: { type: String, enum: ["OPTION_B"], required: true },
    results: { type: [inductionRunItemSchema], required: true },
    counts: {
      revenue: { type: Number, required: true },
      standby: { type: Number, required: true },
      ibl: { type: Number, required: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inductionRunSchema.index({ createdAt: -1 });

export const InductionRun = mongoose.model<InductionRunDocument>("InductionRun", inductionRunSchema);
