import type { ScoringWeights } from "./scoring";

export interface ScoringConfigResponse {
  key: string;
  weights: ScoringWeights;
  updatedBy?: string;
  updatedAt?: string;
}
