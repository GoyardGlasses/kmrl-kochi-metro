export type Decision = "REVENUE" | "STANDBY" | "IBL";

export type FitnessStatus = "PASS" | "WARN" | "FAIL";

export interface ExplanationItem {
  code: string;
  message: string;
}

export interface DecisionExplanation {
  blockers: ExplanationItem[];
  warnings: ExplanationItem[];
  promoters: ExplanationItem[];
  overrides: ExplanationItem[];
  finalReason: string;
}

export interface Conflict {
  type: "MISSING_CERTIFICATE" | "BRANDING_SLA_RISK" | "MILEAGE_IMBALANCE" | "CLEANING_CLASH" | "STABLING_CLASH";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  detectedAt: string;
}

export interface SubsystemFitness {
  status: FitnessStatus;
  details: string;
}

export interface Trainset {
  id: string;
  recommendation: Decision;
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
  conflicts?: Conflict[];
  lastConflictCheck?: string;
  explanation?: DecisionExplanation;
}

export interface DecisionUpdatePayload {
  recommendation: Decision;
  reason?: string;
  manualOverride?: boolean;
}
