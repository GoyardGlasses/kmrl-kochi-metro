import { TrainsetDocument } from "@/models/Trainset";

export interface SimulationRules {
  forceHighBranding?: boolean;
  ignoreJobCards?: boolean;
  ignoreCleaning?: boolean;
  prioritizeLowMileage?: boolean;
}

export const applySimulationRules = (
  trainsets: TrainsetDocument[],
  rules: SimulationRules
): TrainsetDocument[] => {
  return trainsets.map((trainset) => {
    let newRecommendation = trainset.recommendation;
    let newReason = trainset.reason;

    const hasFailure =
      trainset.fitness.rollingStock.status === "FAIL" ||
      trainset.fitness.signalling.status === "FAIL" ||
      trainset.fitness.telecom.status === "FAIL";

    const hasWarning =
      trainset.fitness.rollingStock.status === "WARN" ||
      trainset.fitness.signalling.status === "WARN" ||
      trainset.fitness.telecom.status === "WARN";

    if (hasFailure) {
      newRecommendation = "IBL";
      newReason = "Critical system failure detected.";
    } else if (hasWarning) {
      newRecommendation = "STANDBY";
      newReason = "System warning detected. Suitable for standby.";
    } else {
      newRecommendation = "REVENUE";
      newReason = "All systems operational.";
    }

    if (!rules.ignoreJobCards && trainset.jobCardOpen) {
      newRecommendation = "IBL";
      newReason = "Open job card requires attention.";
    }

    if (!rules.ignoreCleaning && trainset.cleaningStatus === "OVERDUE") {
      if (newRecommendation === "REVENUE") {
        newRecommendation = "STANDBY";
        newReason = "Cleaning overdue. Hold for non-peak service.";
      }
    }

    if (rules.forceHighBranding && trainset.brandingPriority === "HIGH") {
      if (newRecommendation === "STANDBY" && !hasFailure && !trainset.jobCardOpen) {
        newRecommendation = "REVENUE";
        newReason = "Promoted to revenue: High branding priority override.";
      }
    }

    if (rules.prioritizeLowMileage && trainset.mileageKm < 20000) {
      if (newRecommendation === "STANDBY" && !hasFailure && !trainset.jobCardOpen) {
        newRecommendation = "REVENUE";
        newReason = "Promoted to revenue: Low mileage priority.";
      }
    }

    return {
      ...trainset.toObject(),
      recommendation: newRecommendation,
      reason: newReason,
    } as TrainsetDocument;
  });
};
