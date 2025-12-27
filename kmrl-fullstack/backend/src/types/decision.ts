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
  penaltyRisk: number;
  expiryDate: string;
}

export interface MileageBalance {
  trainsetId: string;
  currentMileage: number;
  targetMileage: number;
  variance: number;
  lastService: string;
  componentWear: {
    bogie: number;
    brakePad: number;
    hvac: number;
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
  shuntingDistance: number;
  turnaroundTime: number;
  constraints: {
    canExitAtDawn: boolean;
    requiresShunting: boolean;
    blockedBy?: string;
  };
}

export interface ServiceReadiness {
  trainsetId: string;
  overallScore: number;
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
  type: 'FITNESS_EXPIRY' | 'BRANDING_SLA' | 'MILEAGE_IMBALANCE' | 'CLEANING_CONFLICT' | 'STABLING_BLOCK';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  trainsetId: string;
  message: string;
  impact: string;
  suggestedAction: string;
}

export interface OptimizationResult {
  trainsetId: string;
  recommendation: 'REVENUE' | 'STANDBY' | 'IBL';
  confidence: number;
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
