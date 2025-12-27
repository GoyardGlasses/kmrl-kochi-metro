import mongoose, { Schema, Document } from "mongoose";

export type JobCardStatus = "OPEN" | "CLOSED" | "UNKNOWN";

export interface JobCardDocument extends Document {
  workOrderId: string;
  trainsetId: string;
  status: JobCardStatus;
  isOpen: boolean;
  summary?: string;
  source?: string;
  importedAt: Date;
}

const jobCardSchema = new Schema<JobCardDocument>(
  {
    workOrderId: { type: String, required: true, index: true },
    trainsetId: { type: String, required: true, index: true },
    status: { type: String, enum: ["OPEN", "CLOSED", "UNKNOWN"], required: true },
    isOpen: { type: Boolean, required: true, index: true },
    summary: { type: String },
    source: { type: String },
    importedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

jobCardSchema.index({ trainsetId: 1, workOrderId: 1 }, { unique: true });
jobCardSchema.index({ importedAt: -1 });

export const JobCard = mongoose.model<JobCardDocument>("JobCard", jobCardSchema);
