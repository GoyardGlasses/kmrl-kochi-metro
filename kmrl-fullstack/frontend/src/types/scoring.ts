import type { Decision, FitnessStatus } from "./trainset";
export type { Decision, FitnessStatus } from "./trainset";

export type CleaningStatus = "COMPLETED" | "PENDING" | "OVERDUE";
export type BrandingPriority = "HIGH" | "MEDIUM" | "LOW";

export interface ScoringWeights {
  fitnessPass: number;
  fitnessWarn: number;
  fitnessFail: number;
  lowMileage: number;
  highMileage: number;
  brandingHigh: number;
  brandingMedium: number;
  brandingLow: number;
  cleaningCompleted: number;
  cleaningPending: number;
  cleaningOverdue: number;
  jobCardClear: number;
  jobCardOpen: number;
  conflictHighPenalty: number;
  conflictMediumPenalty: number;
  conflictLowPenalty: number;
  explanationBlockerPenalty: number;
  explanationWarningPenalty: number;
  manualOverridePenalty: number;
}

export interface ScoreBreakdown {
  fitness: number;
  mileage: number;
  branding: number;
  cleaning: number;
  jobCard: number;
  penalties: number;
}

export interface ScoredTrainset {
  id: string;
  recommendation: Decision;
  reason: string;
  mileageKm: number;
  brandingPriority: BrandingPriority;
  jobCardOpen: boolean;
  cleaningStatus: CleaningStatus;
  fitness: {
    rollingStock: { status: FitnessStatus; details: string };
    signalling: { status: FitnessStatus; details: string };
    telecom: { status: FitnessStatus; details: string };
  };
  manualOverride?: boolean;
  conflicts?: any[];
  explanation?: any;
  lastConflictCheck?: string;
  _id: string;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface ScoredInductionResponse {
  ranked: ScoredTrainset[];
  skip: number;
  limit: number;
  total: number;
  weights: ScoringWeights;
}
