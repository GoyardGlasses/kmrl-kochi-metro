import { Conflict, TrainsetDocument } from "@/models/Trainset";

type Decision = "REVENUE" | "STANDBY" | "IBL";

export type TrainsetData = Pick<
  TrainsetDocument,
  | "id"
  | "recommendation"
  | "reason"
  | "mileageKm"
  | "brandingPriority"
  | "jobCardOpen"
  | "cleaningStatus"
  | "fitness"
  | "manualOverride"
>;

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

export interface SimulationRules {
  forceHighBranding?: boolean;
  ignoreJobCards?: boolean;
  ignoreCleaning?: boolean;
  prioritizeLowMileage?: boolean;
}

export const buildExplanation = (
  trainset: TrainsetData,
  rules: SimulationRules,
  finalDecision: Decision,
  finalReason: string
): DecisionExplanation => {
  const blockers: ExplanationItem[] = [];
  const warnings: ExplanationItem[] = [];
  const promoters: ExplanationItem[] = [];
  const overrides: ExplanationItem[] = [];

  // Fitness
  const rs = trainset.fitness.rollingStock.status;
  const sig = trainset.fitness.signalling.status;
  const tel = trainset.fitness.telecom.status;

  if (rs === "FAIL") blockers.push({ code: "FITNESS_RS_FAIL", message: "Rolling Stock fitness FAIL" });
  if (sig === "FAIL") blockers.push({ code: "FITNESS_SIG_FAIL", message: "Signalling fitness FAIL" });
  if (tel === "FAIL") blockers.push({ code: "FITNESS_TEL_FAIL", message: "Telecom fitness FAIL" });

  if (rs === "WARN") warnings.push({ code: "FITNESS_RS_WARN", message: "Rolling Stock fitness WARN" });
  if (sig === "WARN") warnings.push({ code: "FITNESS_SIG_WARN", message: "Signalling fitness WARN" });
  if (tel === "WARN") warnings.push({ code: "FITNESS_TEL_WARN", message: "Telecom fitness WARN" });

  // Job cards
  if (trainset.jobCardOpen) {
    if (rules.ignoreJobCards) {
      overrides.push({ code: "JOB_CARD_IGNORED", message: "Job-card rule ignored (what-if)" });
    } else {
      blockers.push({ code: "JOB_CARD_OPEN", message: "Open job card present" });
    }
  }

  // Cleaning
  if (trainset.cleaningStatus === "OVERDUE") {
    if (rules.ignoreCleaning) {
      overrides.push({ code: "CLEANING_IGNORED", message: "Cleaning rule ignored (what-if)" });
    } else {
      warnings.push({ code: "CLEANING_OVERDUE", message: "Cleaning overdue" });
    }
  }

  // Branding
  if (trainset.brandingPriority === "HIGH") {
    promoters.push({ code: "BRANDING_HIGH", message: "High branding priority" });
    if (rules.forceHighBranding) {
      overrides.push({ code: "BRANDING_FORCE", message: "Branding priority forced (what-if)" });
    }
  }

  // Mileage
  if (rules.prioritizeLowMileage && trainset.mileageKm < 20000) {
    promoters.push({ code: "MILEAGE_LOW", message: "Low mileage priority enabled" });
  }
  if (trainset.mileageKm > 50000) {
    warnings.push({ code: "MILEAGE_HIGH", message: `High mileage (${trainset.mileageKm} km)` });
  }

  // Manual override
  if (trainset.manualOverride) {
    overrides.push({ code: "MANUAL_OVERRIDE", message: "Manual decision override applied" });
  }

  // If decision is REVENUE but blockers exist, clarify override
  if (finalDecision === "REVENUE" && blockers.length > 0) {
    overrides.push({
      code: "REVENUE_WITH_BLOCKERS",
      message: "Revenue decision despite blockers (review required)",
    });
  }

  return {
    blockers,
    warnings,
    promoters,
    overrides,
    finalReason,
  };
};

export const detectConflicts = (trainset: TrainsetData): Conflict[] => {
  const conflicts: Conflict[] = [];
  const now = new Date();

  // Missing/Expired certificates (FAIL status)
  if (trainset.fitness.rollingStock.status === "FAIL") {
    conflicts.push({
      type: "MISSING_CERTIFICATE",
      severity: "HIGH",
      message: "Rolling Stock fitness certificate expired/invalid",
      detectedAt: now,
    });
  }
  if (trainset.fitness.signalling.status === "FAIL") {
    conflicts.push({
      type: "MISSING_CERTIFICATE",
      severity: "HIGH",
      message: "Signalling fitness certificate expired/invalid",
      detectedAt: now,
    });
  }
  if (trainset.fitness.telecom.status === "FAIL") {
    conflicts.push({
      type: "MISSING_CERTIFICATE",
      severity: "HIGH",
      message: "Telecom fitness certificate expired/invalid",
      detectedAt: now,
    });
  }

  // Branding SLA risk (HIGH priority not in REVENUE)
  if (trainset.brandingPriority === "HIGH" && trainset.recommendation !== "REVENUE") {
    conflicts.push({
      type: "BRANDING_SLA_RISK",
      severity: "MEDIUM",
      message: "High branding priority train not in revenue service",
      detectedAt: now,
    });
  }

  // Mileage imbalance (very high mileage)
  if (trainset.mileageKm > 50000) {
    conflicts.push({
      type: "MILEAGE_IMBALANCE",
      severity: "MEDIUM",
      message: `High mileage: ${trainset.mileageKm} km - consider maintenance rotation`,
      detectedAt: now,
    });
  }

  // Cleaning clash (OVERDUE but assigned to REVENUE)
  if (trainset.cleaningStatus === "OVERDUE" && trainset.recommendation === "REVENUE") {
    conflicts.push({
      type: "CLEANING_CLASH",
      severity: "LOW",
      message: "Cleaning overdue but assigned to revenue service",
      detectedAt: now,
    });
  }

  // Stabling clash (simplified - would need bay geometry data)
  // For now, we'll flag any train with manual override as potential stabling clash
  if (trainset.manualOverride) {
    conflicts.push({
      type: "STABLING_CLASH",
      severity: "LOW",
      message: "Manual override - verify stabling arrangement",
      detectedAt: now,
    });
  }

  return conflicts;
};

export const applySimulationRules = (
  trainsets: TrainsetData[],
  rules: SimulationRules
): Array<TrainsetData & { conflicts: Conflict[]; explanation: DecisionExplanation; lastConflictCheck: Date }> => {
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

    // Detect conflicts for the updated recommendation
    const conflicts = detectConflicts({
      ...(trainset as any),
      recommendation: newRecommendation,
      reason: newReason,
    } as any);

    const explanation = buildExplanation(
      trainset,
      rules,
      newRecommendation,
      newReason
    );

    return {
      ...trainset,
      recommendation: newRecommendation,
      reason: newReason,
      conflicts,
      explanation,
      lastConflictCheck: new Date(),
    };
  });
};
