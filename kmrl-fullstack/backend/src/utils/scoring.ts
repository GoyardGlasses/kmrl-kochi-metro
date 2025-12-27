import type { TrainsetData, DecisionExplanation } from "./simulation";
import type { Conflict } from "@/models/Trainset";

export interface ScoredTrainset extends TrainsetData {
  _id: string;
  score: number;
  breakdown: {
    fitness: number;
    mileage: number;
    branding: number;
    cleaning: number;
    jobCard: number;
    penalties: number;
  };
}

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

export const DEFAULT_WEIGHTS: ScoringWeights = {
  fitnessPass: 10,
  fitnessWarn: -5,
  fitnessFail: -20,
  lowMileage: 8,
  highMileage: -6,
  brandingHigh: 6,
  brandingMedium: 2,
  brandingLow: 0,
  cleaningCompleted: 4,
  cleaningPending: 0,
  cleaningOverdue: -4,
  jobCardClear: 5,
  jobCardOpen: -8,
  conflictHighPenalty: -25,
  conflictMediumPenalty: -10,
  conflictLowPenalty: -3,
  explanationBlockerPenalty: -8,
  explanationWarningPenalty: -2,
  manualOverridePenalty: -1,
};

export type ScoringInput = TrainsetData & {
  _id?: any;
  conflicts?: Conflict[];
  explanation?: DecisionExplanation;
};

const scoreFitness = (t: TrainsetData, w: ScoringWeights) => {
  const rs = t.fitness.rollingStock.status;
  const sig = t.fitness.signalling.status;
  const tel = t.fitness.telecom.status;

  let score = 0;
  if (rs === "PASS") score += w.fitnessPass;
  else if (rs === "WARN") score += w.fitnessWarn;
  else score += w.fitnessFail;

  if (sig === "PASS") score += w.fitnessPass;
  else if (sig === "WARN") score += w.fitnessWarn;
  else score += w.fitnessFail;

  if (tel === "PASS") score += w.fitnessPass;
  else if (tel === "WARN") score += w.fitnessWarn;
  else score += w.fitnessFail;

  return score;
};

const scoreMileage = (t: TrainsetData, w: ScoringWeights) => {
  if (t.mileageKm < 20000) return w.lowMileage;
  if (t.mileageKm > 50000) return w.highMileage;
  return 0;
};

const scoreBranding = (t: TrainsetData, w: ScoringWeights) => {
  if (t.brandingPriority === "HIGH") return w.brandingHigh;
  if (t.brandingPriority === "MEDIUM") return w.brandingMedium;
  return w.brandingLow;
};

const scoreCleaning = (t: TrainsetData, w: ScoringWeights) => {
  if (t.cleaningStatus === "COMPLETED") return w.cleaningCompleted;
  if (t.cleaningStatus === "PENDING") return w.cleaningPending;
  return w.cleaningOverdue;
};

const scoreJobCard = (t: TrainsetData, w: ScoringWeights) => {
  return t.jobCardOpen ? w.jobCardOpen : w.jobCardClear;
};

const scorePenalties = (t: ScoringInput, w: ScoringWeights) => {
  let penalties = 0;

  const conflicts = t.conflicts ?? [];
  for (const c of conflicts) {
    if (c.severity === "HIGH") penalties += w.conflictHighPenalty;
    else if (c.severity === "MEDIUM") penalties += w.conflictMediumPenalty;
    else penalties += w.conflictLowPenalty;
  }

  const ex = t.explanation;
  if (ex) {
    penalties += (ex.blockers?.length || 0) * w.explanationBlockerPenalty;
    penalties += (ex.warnings?.length || 0) * w.explanationWarningPenalty;
  }

  if (t.manualOverride) penalties += w.manualOverridePenalty;

  return penalties;
};

export const scoreTrainset = (t: ScoringInput, weights: ScoringWeights = DEFAULT_WEIGHTS): ScoredTrainset => {
  const fitness = scoreFitness(t, weights);
  const mileage = scoreMileage(t, weights);
  const branding = scoreBranding(t, weights);
  const cleaning = scoreCleaning(t, weights);
  const jobCard = scoreJobCard(t, weights);

  const penalties = scorePenalties(t, weights);

  const score = fitness + mileage + branding + cleaning + jobCard + penalties;

  return {
    ...t,
    _id: (t as any)._id,
    score,
    breakdown: { fitness, mileage, branding, cleaning, jobCard, penalties },
  };
};

export const rankTrainsets = (trainsets: ScoringInput[], weights?: ScoringWeights): ScoredTrainset[] => {
  const scored = trainsets.map((t) => scoreTrainset(t, weights));
  return scored.sort((a, b) => b.score - a.score);
};
