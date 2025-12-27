import type {
  FitnessCertificate,
  BrandingContract,
  MileageBalance,
  CleaningSlot,
  StablingGeometry,
  ServiceReadiness,
  ConflictAlert,
  OptimizationResult,
  WhatIfScenario,
  MLSuggestionsResponse
} from "@/types";
import { httpClient } from "./httpClient";

export class DecisionService {
  // Fitness Certificates
  async getFitnessCertificates(trainsetId?: string): Promise<FitnessCertificate[]> {
    const params = trainsetId ? `?trainsetId=${trainsetId}` : '';
    return httpClient.get<FitnessCertificate[]>(`/fitness/certificates${params}`);
  }

  async updateFitnessCertificate(id: string, certificate: Partial<FitnessCertificate>): Promise<FitnessCertificate> {
    return httpClient.patch<FitnessCertificate>(`/fitness/certificates/${id}`, certificate);
  }

  // Branding Contracts
  async getBrandingContracts(): Promise<BrandingContract[]> {
    return httpClient.get<BrandingContract[]>("/branding/contracts");
  }

  async updateBrandingContract(id: string, contract: Partial<BrandingContract>): Promise<BrandingContract> {
    return httpClient.patch<BrandingContract>(`/branding/contracts/${id}`, contract);
  }

  // Mileage Balancing
  async getMileageBalances(): Promise<MileageBalance[]> {
    return httpClient.get<MileageBalance[]>("/mileage/balances");
  }

  async optimizeMileage(): Promise<MileageBalance[]> {
    return httpClient.post<MileageBalance[]>("/mileage/optimize", {});
  }

  // Cleaning Slots
  async getCleaningSlots(date?: string): Promise<CleaningSlot[]> {
    const params = date ? `?date=${date}` : '';
    return httpClient.get<CleaningSlot[]>(`/cleaning/slots${params}`);
  }

  async bookCleaningSlot(bayId: string, trainsetId: string, cleaningType: string): Promise<CleaningSlot> {
    return httpClient.post<CleaningSlot>(`/cleaning/slots/${bayId}/book`, { trainsetId, cleaningType });
  }

  // Stabling Geometry
  async getStablingGeometry(): Promise<StablingGeometry[]> {
    return httpClient.get<StablingGeometry[]>("/stabling/geometry");
  }

  async optimizeStabling(): Promise<StablingGeometry[]> {
    return httpClient.post<StablingGeometry[]>("/stabling/optimize", {});
  }

  // Service Readiness
  async getServiceReadiness(): Promise<ServiceReadiness[]> {
    return httpClient.get<ServiceReadiness[]>("/service/readiness");
  }

  async calculateServiceReadiness(trainsetId: string): Promise<ServiceReadiness> {
    return httpClient.post<ServiceReadiness>(`/service/readiness/${trainsetId}`, {});
  }

  // Conflict Alerts
  async getConflictAlerts(): Promise<ConflictAlert[]> {
    return httpClient.get<ConflictAlert[]>("/conflicts/alerts");
  }

  async resolveConflict(alertId: string, action: string): Promise<ConflictAlert> {
    return httpClient.post<ConflictAlert>(`/conflicts/alerts/${alertId}/resolve`, { action });
  }

  // Optimization Engine
  async runOptimization(targetKpi?: string): Promise<OptimizationResult[]> {
    const params = targetKpi ? `?target=${targetKpi}` : '';
    return httpClient.post<OptimizationResult[]>(`/optimization/run${params}`, {});
  }

  async getOptimizationHistory(): Promise<OptimizationResult[]> {
    return httpClient.get<OptimizationResult[]>("/optimization/history");
  }

  // What-If Scenarios
  async getWhatIfScenarios(): Promise<WhatIfScenario[]> {
    return httpClient.get<WhatIfScenario[]>("/whatif/scenarios");
  }

  async createWhatIfScenario(scenario: Omit<WhatIfScenario, 'id' | 'results' | 'summary'>): Promise<WhatIfScenario> {
    return httpClient.post<WhatIfScenario>("/whatif/scenarios", scenario);
  }

  async runWhatIfScenario(scenarioId: string): Promise<WhatIfScenario> {
    return httpClient.post<WhatIfScenario>(`/whatif/scenarios/${scenarioId}/run`, {});
  }

  async deleteWhatIfScenario(scenarioId: string): Promise<void> {
    return httpClient.delete(`/whatif/scenarios/${scenarioId}`);
  }

  // KPI Dashboard
  async getKPIDashboard(): Promise<{
    punctuality: number;
    fleetAvailability: number;
    maintenanceCost: number;
    brandingCompliance: number;
    energyConsumption: number;
  }> {
    return httpClient.get("/kpi/dashboard");
  }

  // Mock ML Suggestions (advisory-only)
  async getMlSuggestions(params?: { limit?: number; onlyChanged?: boolean }): Promise<MLSuggestionsResponse> {
    const limit = params?.limit ?? 6;
    const onlyChanged = params?.onlyChanged ?? true;
    return httpClient.get<MLSuggestionsResponse>(`/trainsets/ml-suggestions?limit=${limit}&onlyChanged=${onlyChanged}`);
  }
}

export const decisionService = new DecisionService();
