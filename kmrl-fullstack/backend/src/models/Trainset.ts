import mongoose, { Schema, Document } from "mongoose";

export interface SubsystemFitness {
  status: "PASS" | "WARN" | "FAIL";
  details: string;
}

export interface Conflict {
  type: "MISSING_CERTIFICATE" | "BRANDING_SLA_RISK" | "MILEAGE_IMBALANCE" | "CLEANING_CLASH" | "STABLING_CLASH";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  detectedAt: Date;
}

export interface TrainsetDocument extends Document {
  id: string;
  depotId?: string;
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
  conflicts?: Conflict[];
  lastConflictCheck?: Date;
}

const trainsetSchema = new Schema<TrainsetDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    depotId: { type: String, default: "DEPOT-1", index: true },
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
    conflicts: [{
      type: { type: String, enum: ["MISSING_CERTIFICATE", "BRANDING_SLA_RISK", "MILEAGE_IMBALANCE", "CLEANING_CLASH", "STABLING_CLASH"], required: true },
      severity: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], required: true },
      message: { type: String, required: true },
      detectedAt: { type: Date, required: true },
    }],
    lastConflictCheck: { type: Date },
  },
  { timestamps: true }
);

export const Trainset = mongoose.model<TrainsetDocument>("Trainset", trainsetSchema);
