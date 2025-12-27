import type { SimulationRules, Trainset, Decision } from "@/types";

const determineBaseDecision = (trainset: Trainset): Decision => {
  const hasFailure =
    trainset.fitness.rollingStock.status === "FAIL" ||
    trainset.fitness.signalling.status === "FAIL" ||
    trainset.fitness.telecom.status === "FAIL";

  if (hasFailure) {
    return "IBL";
  }

  const hasWarning =
    trainset.fitness.rollingStock.status === "WARN" ||
    trainset.fitness.signalling.status === "WARN" ||
    trainset.fitness.telecom.status === "WARN";

  if (hasWarning) {
    return "STANDBY";
  }

  return "REVENUE";
};

export const applySimulationRules = (
  trainsets: Trainset[],
  rules: SimulationRules
): Trainset[] => {
  return trainsets.map((trainset) => {
    let recommendation = determineBaseDecision(trainset);
    let reason =
      recommendation === "IBL"
        ? "Critical system failure detected."
        : recommendation === "STANDBY"
        ? "System warning detected. Suitable for standby."
        : "All systems operational.";

    if (!rules.ignoreJobCards && trainset.jobCardOpen) {
      recommendation = "IBL";
      reason = "Open job card requires attention.";
    }

    if (!rules.ignoreCleaning && trainset.cleaningStatus === "OVERDUE") {
      if (recommendation === "REVENUE") {
        recommendation = "STANDBY";
        reason = "Cleaning overdue. Hold for non-peak service.";
      }
    }

    if (
      rules.forceHighBranding &&
      trainset.brandingPriority === "HIGH" &&
      recommendation === "STANDBY" &&
      !trainset.jobCardOpen &&
      trainset.fitness.rollingStock.status !== "FAIL" &&
      trainset.fitness.signalling.status !== "FAIL" &&
      trainset.fitness.telecom.status !== "FAIL"
    ) {
      recommendation = "REVENUE";
      reason = "Promoted to revenue: High branding priority override.";
    }

    if (
      rules.prioritizeLowMileage &&
      trainset.mileageKm < 20000 &&
      recommendation === "STANDBY" &&
      !trainset.jobCardOpen
    ) {
      recommendation = "REVENUE";
      reason = "Promoted to revenue: Low mileage priority.";
    }

    return {
      ...trainset,
      recommendation,
      reason,
    };
  });
};
