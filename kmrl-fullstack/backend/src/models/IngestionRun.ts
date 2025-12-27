import mongoose, { Schema, Document } from "mongoose";

export type IngestionSource = "MAXIMO_JOB_CARDS" | "FITNESS" | "UNS_FITNESS";
export type IngestionStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface IngestionRunDocument extends Document {
  source: IngestionSource;
  status: IngestionStatus;
  startedAt: Date;
  finishedAt?: Date;
  recordsRead?: number;
  recordsUpserted?: number;
  trainsetsUpdated?: number;
  error?: string;
  metadata?: any;
}

const ingestionRunSchema = new Schema<IngestionRunDocument>(
  {
    source: { type: String, enum: ["MAXIMO_JOB_CARDS", "FITNESS", "UNS_FITNESS"], required: true, index: true },
    status: { type: String, enum: ["RUNNING", "SUCCESS", "FAILED"], required: true, index: true },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date },
    recordsRead: { type: Number },
    recordsUpserted: { type: Number },
    trainsetsUpdated: { type: Number },
    error: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ingestionRunSchema.index({ createdAt: -1 });

ingestionRunSchema.index({ source: 1, startedAt: -1 });

export const IngestionRun = mongoose.model<IngestionRunDocument>("IngestionRun", ingestionRunSchema);
