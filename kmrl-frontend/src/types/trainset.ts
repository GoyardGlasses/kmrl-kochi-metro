export type Decision = "REVENUE" | "STANDBY" | "IBL";

export type FitnessStatus = "PASS" | "WARN" | "FAIL";

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
}

export interface DecisionUpdatePayload {
  recommendation: Decision;
  reason?: string;
  manualOverride?: boolean;
}
