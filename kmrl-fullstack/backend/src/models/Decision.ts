import mongoose, { Schema, Document } from 'mongoose';

export interface FitnessCertificateDocument extends Document {
  department: 'ROLLING_STOCK' | 'SIGNALLING' | 'TELECOM';
  trainsetId: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  validFrom: Date;
  validUntil: Date;
  lastInspection: Date;
  nextInspectionDue: Date;
  inspectorName?: string;
  details?: string;
}

const fitnessCertificateSchema = new Schema<FitnessCertificateDocument>({
  department: { type: String, enum: ['ROLLING_STOCK', 'SIGNALLING', 'TELECOM'], required: true },
  trainsetId: { type: String, required: true, ref: 'Trainset' },
  status: { type: String, enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED'], required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  lastInspection: { type: Date, required: true },
  nextInspectionDue: { type: Date, required: true },
  inspectorName: { type: String },
  details: { type: String }
}, { timestamps: true });

fitnessCertificateSchema.index({ trainsetId: 1, department: 1 }, { unique: true });
fitnessCertificateSchema.index({ validUntil: 1 });
fitnessCertificateSchema.index({ status: 1 });

export interface BrandingContractDocument extends Document {
  trainsetId: string;
  advertiser: string;
  contractHours: number;
  currentHours: number;
  remainingHours: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  penaltyRisk: number;
  expiryDate: Date;
  lastUpdated: Date;
  updatedBy: string;
}

const brandingContractSchema = new Schema<BrandingContractDocument>({
  trainsetId: { type: String, required: true, ref: 'Trainset', unique: true },
  advertiser: { type: String, required: true },
  contractHours: { type: Number, required: true },
  currentHours: { type: Number, required: true },
  remainingHours: { type: Number, required: true },
  priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], required: true },
  penaltyRisk: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  lastUpdated: { type: Date, required: true },
  updatedBy: { type: String, required: true }
}, { timestamps: true });

brandingContractSchema.index({ trainsetId: 1 }, { unique: true });
brandingContractSchema.index({ expiryDate: 1 });
brandingContractSchema.index({ priority: 1 });

export interface MileageBalanceDocument extends Document {
  trainsetId: string;
  currentMileage: number;
  targetMileage: number;
  variance: number;
  lastService: Date;
  lastServiceMileage: number;
  componentWear: {
    bogie: number;
    brakePad: number;
    hvac: number;
  };
  updatedBy: string;
}

const mileageBalanceSchema = new Schema<MileageBalanceDocument>({
  trainsetId: { type: String, required: true, ref: 'Trainset', unique: true },
  currentMileage: { type: Number, required: true },
  targetMileage: { type: Number, required: true },
  variance: { type: Number, required: true },
  lastService: { type: Date, required: true },
  lastServiceMileage: { type: Number, required: true },
  componentWear: {
    bogie: { type: Number, required: true },
    brakePad: { type: Number, required: true },
    hvac: { type: Number, required: true }
  },
  updatedBy: { type: String, required: true }
}, { timestamps: true });

mileageBalanceSchema.index({ trainsetId: 1 }, { unique: true });
mileageBalanceSchema.index({ currentMileage: 1 });

export interface CleaningSlotDocument extends Document {
  bayId: string;
  availableFrom: Date;
  availableUntil: Date;
  capacity: number;
  currentOccupancy: number;
  manpowerAvailable: number;
  cleaningType: 'BASIC' | 'DEEP' | 'DETAILING';
  assignedTrainsets: string[];
  status: 'AVAILABLE' | 'PARTIAL' | 'FULL';
}

const cleaningSlotSchema = new Schema<CleaningSlotDocument>({
  bayId: { type: String, required: true, unique: true },
  availableFrom: { type: Date, required: true },
  availableUntil: { type: Date, required: true },
  capacity: { type: Number, required: true },
  currentOccupancy: { type: Number, required: true },
  manpowerAvailable: { type: Number, required: true },
  cleaningType: { type: String, enum: ['BASIC', 'DEEP', 'DETAILING'], required: true },
  assignedTrainsets: [{ type: String, ref: 'Trainset' }],
  status: { type: String, enum: ['AVAILABLE', 'PARTIAL', 'FULL'], required: true }
}, { timestamps: true });

cleaningSlotSchema.index({ bayId: 1 }, { unique: true });
cleaningSlotSchema.index({ availableFrom: 1, availableUntil: 1 });
cleaningSlotSchema.index({ status: 1 });

export interface StablingGeometryDocument extends Document {
  bayId: string;
  position: number;
  trainsetId?: string;
  shuntingDistance: number;
  turnaroundTime: number;
  constraints: {
    canExitAtDawn: boolean;
    requiresShunting: boolean;
    blockedBy?: string;
  };
  lastUpdated: Date;
}

const stablingGeometrySchema = new Schema<StablingGeometryDocument>({
  bayId: { type: String, required: true },
  position: { type: Number, required: true },
  trainsetId: { type: String, ref: 'Trainset' },
  shuntingDistance: { type: Number, required: true },
  turnaroundTime: { type: Number, required: true },
  constraints: {
    canExitAtDawn: { type: Boolean, required: true },
    requiresShunting: { type: Boolean, required: true },
    blockedBy: { type: String }
  },
  lastUpdated: { type: Date, required: true }
}, { timestamps: true });

stablingGeometrySchema.index({ bayId: 1, position: 1 }, { unique: true });
stablingGeometrySchema.index({ trainsetId: 1 });
stablingGeometrySchema.index({ shuntingDistance: 1 });

export interface ServiceReadinessDocument extends Document {
  trainsetId: string;
  overallScore: number;
  factors: {
    fitness: number;
    jobCards: number;
    branding: number;
    mileage: number;
    cleaning: number;
    stabling: number;
  };
  blockers: string[];
  warnings: string[];
  recommendations: string[];
  calculatedAt: Date;
}

const serviceReadinessSchema = new Schema<ServiceReadinessDocument>({
  trainsetId: { type: String, required: true, ref: 'Trainset', unique: true },
  overallScore: { type: Number, required: true },
  factors: {
    fitness: { type: Number, required: true },
    jobCards: { type: Number, required: true },
    branding: { type: Number, required: true },
    mileage: { type: Number, required: true },
    cleaning: { type: Number, required: true },
    stabling: { type: Number, required: true }
  },
  blockers: [{ type: String }],
  warnings: [{ type: String }],
  recommendations: [{ type: String }],
  calculatedAt: { type: Date, required: true }
}, { timestamps: true });

serviceReadinessSchema.index({ trainsetId: 1 }, { unique: true });
serviceReadinessSchema.index({ overallScore: 1 });
serviceReadinessSchema.index({ calculatedAt: 1 });

export interface ConflictAlertDocument extends Document {
  type: 'FITNESS_EXPIRY' | 'BRANDING_SLA' | 'MILEAGE_IMBALANCE' | 'CLEANING_CONFLICT' | 'STABLING_BLOCK';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  trainsetId: string;
  message: string;
  impact: string;
  suggestedAction: string;
  status: 'ACTIVE' | 'RESOLVED' | 'IGNORED';
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

const conflictAlertSchema = new Schema<ConflictAlertDocument>({
  type: { type: String, enum: ['FITNESS_EXPIRY', 'BRANDING_SLA', 'MILEAGE_IMBALANCE', 'CLEANING_CONFLICT', 'STABLING_BLOCK'], required: true },
  severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], required: true },
  trainsetId: { type: String, required: true, ref: 'Trainset' },
  message: { type: String, required: true },
  impact: { type: String, required: true },
  suggestedAction: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'IGNORED'], required: true },
  detectedAt: { type: Date, required: true },
  resolvedAt: { type: Date },
  resolvedBy: { type: String }
}, { timestamps: true });

conflictAlertSchema.index({ trainsetId: 1, status: 1 });
conflictAlertSchema.index({ severity: 1, status: 1 });
conflictAlertSchema.index({ detectedAt: 1 });

export interface OptimizationResultDocument extends Document {
  trainsetId: string;
  recommendation: 'REVENUE' | 'STANDBY' | 'IBL';
  confidence: number;
  reasoning: string[];
  conflicts: {
    type: string;
    severity: string;
    message: string;
  }[];
  kpiImpact: {
    punctuality: number;
    cost: number;
    brandingCompliance: number;
    fleetAvailability: number;
  };
  optimizationRunId: string;
  calculatedAt: Date;
}

const optimizationResultSchema = new Schema<OptimizationResultDocument>({
  trainsetId: { type: String, required: true, ref: 'Trainset' },
  recommendation: { type: String, enum: ['REVENUE', 'STANDBY', 'IBL'], required: true },
  confidence: { type: Number, required: true },
  reasoning: [{ type: String }],
  conflicts: [{
    type: { type: String },
    severity: { type: String },
    message: { type: String }
  }],
  kpiImpact: {
    punctuality: { type: Number, required: true },
    cost: { type: Number, required: true },
    brandingCompliance: { type: Number, required: true },
    fleetAvailability: { type: Number, required: true }
  },
  optimizationRunId: { type: String, required: true },
  calculatedAt: { type: Date, required: true }
}, { timestamps: true });

optimizationResultSchema.index({ trainsetId: 1, calculatedAt: -1 });
optimizationResultSchema.index({ optimizationRunId: 1 });
optimizationResultSchema.index({ recommendation: 1 });

export interface WhatIfScenarioDocument extends Document {
  name: string;
  description: string;
  parameters: {
    excludeTrainsets?: string[];
    forceRevenue?: string[];
    overrideConstraints?: boolean;
    targetKpi?: 'PUNCTUALITY' | 'COST' | 'BRANDING' | 'AVAILABILITY';
  };
  results: {
    trainsetId: string;
    recommendation: string;
    confidence: number;
  }[];
  summary: {
    revenueCount: number;
    standbyCount: number;
    iblCount: number;
    overallScore: number;
  };
  createdBy: string;
  createdAt: Date;
}

const whatIfScenarioSchema = new Schema<WhatIfScenarioDocument>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  parameters: {
    excludeTrainsets: [{ type: String }],
    forceRevenue: [{ type: String }],
    overrideConstraints: { type: Boolean },
    targetKpi: { type: String, enum: ['PUNCTUALITY', 'COST', 'BRANDING', 'AVAILABILITY'] }
  },
  results: [{
    trainsetId: { type: String },
    recommendation: { type: String },
    confidence: { type: Number }
  }],
  summary: {
    revenueCount: { type: Number, required: true },
    standbyCount: { type: Number, required: true },
    iblCount: { type: Number, required: true },
    overallScore: { type: Number, required: true }
  },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, required: true }
}, { timestamps: true });

whatIfScenarioSchema.index({ createdBy: 1 });
whatIfScenarioSchema.index({ createdAt: -1 });

export const FitnessCertificate = mongoose.model<FitnessCertificateDocument>('FitnessCertificate', fitnessCertificateSchema);
export const BrandingContract = mongoose.model<BrandingContractDocument>('BrandingContract', brandingContractSchema);
export const MileageBalance = mongoose.model<MileageBalanceDocument>('MileageBalance', mileageBalanceSchema);
export const CleaningSlot = mongoose.model<CleaningSlotDocument>('CleaningSlot', cleaningSlotSchema);
export const StablingGeometry = mongoose.model<StablingGeometryDocument>('StablingGeometry', stablingGeometrySchema);
export const ServiceReadiness = mongoose.model<ServiceReadinessDocument>('ServiceReadiness', serviceReadinessSchema);
export const ConflictAlert = mongoose.model<ConflictAlertDocument>('ConflictAlert', conflictAlertSchema);
export const OptimizationResult = mongoose.model<OptimizationResultDocument>('OptimizationResult', optimizationResultSchema);
export const WhatIfScenario = mongoose.model<WhatIfScenarioDocument>('WhatIfScenario', whatIfScenarioSchema);
