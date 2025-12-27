import mongoose, { Schema, Document } from "mongoose";

export interface SubsystemFitness {
  status: "PASS" | "WARN" | "FAIL";
  details: string;
}

export interface TrainsetDocument extends Document {
  id: string;
  recommendation: "REVENUE" | "STANDBY" | "IBL";
  reason: string;
  mileageKm: number;
  brandingPriority: "HIGH" | "MEDIUM" | "LOW";
  jobCardOpen: boolean;
  cleaningStatus: "COMPLETED" | "PENDING" | "OVERDUE";
  fitness: {
    rollingStock: SubsystemFitness;
    signalling: SubsystemFitness;
    telecom: SubsystemFitness;
  };
  manualOverride?: boolean;
  lastUpdated?: Date;
  updatedBy?: string;
}

const trainsetSchema = new Schema<TrainsetDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    recommendation: {
      type: String,
      enum: ["REVENUE", "STANDBY", "IBL"],
      required: true,
    },
    reason: { type: String, required: true },
    mileageKm: { type: Number, required: true },
    brandingPriority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      required: true,
    },
    jobCardOpen: { type: Boolean, required: true },
    cleaningStatus: {
      type: String,
      enum: ["COMPLETED", "PENDING", "OVERDUE"],
      required: true,
    },
    fitness: {
      rollingStock: {
        status: { type: String, enum: ["PASS", "WARN", "FAIL"], required: true },
        details: { type: String, required: true },
      },
      signalling: {
        status: { type: String, enum: ["PASS", "WARN", "FAIL"], required: true },
        details: { type: String, required: true },
      },
      telecom: {
        status: { type: String, enum: ["PASS", "WARN", "FAIL"], required: true },
        details: { type: String, required: true },
      },
    },
    manualOverride: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const Trainset = mongoose.model<TrainsetDocument>("Trainset", trainsetSchema);
