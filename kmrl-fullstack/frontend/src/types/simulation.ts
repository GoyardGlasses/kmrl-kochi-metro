import type { Decision, Trainset } from "./trainset";

export interface SimulationRules {
  forceHighBranding?: boolean;
  ignoreJobCards?: boolean;
  ignoreCleaning?: boolean;
  prioritizeLowMileage?: boolean;
}

export interface SimulationResult {
  trainsets: Trainset[];
  counts: Record<Decision, number>;
}
