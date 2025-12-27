import mongoose, { Schema, Document } from "mongoose";
import type { ScoringWeights } from "@/utils/scoring";

export interface ScoringConfigDocument extends Document {
  key: string;
  weights: ScoringWeights;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const scoringConfigSchema = new Schema<ScoringConfigDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    weights: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const ScoringConfig = mongoose.model<ScoringConfigDocument>("ScoringConfig", scoringConfigSchema);
