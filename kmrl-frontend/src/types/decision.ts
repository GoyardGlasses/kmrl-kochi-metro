export interface FitnessCertificate {
  department: 'ROLLING_STOCK' | 'SIGNALLING' | 'TELECOM';
  validFrom: string;
  validUntil: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  lastInspection: string;
  nextInspectionDue: string;
}

export interface BrandingContract {
  trainsetId: string;
  advertiser: string;
  contractHours: number;
  currentHours: number;
  remainingHours: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  penaltyRisk: number; // % of revenue penalty
  expiryDate: string;
}

export interface MileageBalance {
  trainsetId: string;
  currentMileage: number;
  targetMileage: number;
  variance: number; // deviation from target
  lastService: string;
  componentWear: {
    bogie: number; // % wear
    brakePad: number; // % wear
    hvac: number; // % wear
  };
}

export interface CleaningSlot {
  bayId: string;
  availableFrom: string;
  availableUntil: string;
  capacity: number;
  currentOccupancy: number;
  manpowerAvailable: number;
  cleaningType: 'BASIC' | 'DEEP' | 'DETAILING';
}

export interface StablingGeometry {
  bayId: string;
  position: number;
  trainsetId?: string;
  shuntingDistance: number; // meters from exit
  turnaroundTime: number; // minutes to exit
  constraints: {
    canExitAtDawn: boolean;
    requiresShunting: boolean;
    blockedBy?: string; // trainset ID blocking this position
  };
}

export interface ServiceReadiness {
  trainsetId: string;
  overallScore: number; // 0-100
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
}

export interface ConflictAlert {
  _id?: string;
  type: 'FITNESS_EXPIRY' | 'BRANDING_SLA' | 'MILEAGE_IMBALANCE' | 'CLEANING_CONFLICT' | 'STABLING_BLOCK';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  trainsetId: string;
  message: string;
  impact: string;
  suggestedAction: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'IGNORED';
  detectedAt?: string;
}

export interface OptimizationResult {
  trainsetId: string;
  recommendation: 'REVENUE' | 'STANDBY' | 'IBL';
  confidence: number; // 0-100
  reasoning: string[];
  conflicts: ConflictAlert[];
  kpiImpact: {
    punctuality: number;
    cost: number;
    brandingCompliance: number;
    fleetAvailability: number;
  };
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    excludeTrainsets?: string[];
    forceRevenue?: string[];
    overrideConstraints?: boolean;
    targetKpi?: 'PUNCTUALITY' | 'COST' | 'BRANDING' | 'AVAILABILITY';
  };
  results: OptimizationResult[];
  summary: {
    revenueCount: number;
    standbyCount: number;
    iblCount: number;
    overallScore: number;
  };
}

export interface MLSuggestion {
  trainsetId: string;
  currentDecision: 'REVENUE' | 'STANDBY' | 'IBL';
  suggestedDecision: 'REVENUE' | 'STANDBY' | 'IBL';
  confidence: number;
  reasons: string[];
}

export interface MLSuggestionsResponse {
  generatedAt: string;
  limit: number;
  onlyChanged: boolean;
  suggestions: MLSuggestion[];
}
