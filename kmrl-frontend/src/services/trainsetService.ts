import type {
  DecisionUpdatePayload,
  SimulationResult,
  SimulationRules,
  Trainset,
  ScoredInductionResponse,
  ScoringWeights,
  ScoringConfigResponse,
  IngestionRunListResponse,
  IngestionRun,
  IngestionNotificationSettingsResponse,
  AuditLogListResponse,
} from "@/types";
import { httpClient } from "./httpClient";
import type { TrainsetService } from "./types";

export class HttpTrainsetService implements TrainsetService {
  async listTrainsets(): Promise<Trainset[]> {
    return httpClient.get<Trainset[]>("/trainsets");
  }

  async getTrainset(id: string): Promise<Trainset> {
    return httpClient.get<Trainset>(`/trainsets/${id}`);
  }

  async updateDecision(id: string, payload: DecisionUpdatePayload): Promise<Trainset> {
    return httpClient.patch<Trainset, DecisionUpdatePayload>(`/trainsets/${id}`, payload);
  }

  async simulate(rules: SimulationRules): Promise<SimulationResult> {
    return httpClient.post<SimulationResult, SimulationRules>("/trainsets/simulate", rules);
  }

  // Scored Induction
  async getScoredInduction(params?: any): Promise<ScoredInductionResponse> {
    return httpClient.get<ScoredInductionResponse>("/trainsets/scored-induction", params);
  }

  // Scoring Config
  async getScoringConfig(): Promise<ScoringConfigResponse> {
    return httpClient.get<ScoringConfigResponse>("/trainsets/scoring-config");
  }

  async updateScoringConfig(weights: ScoringWeights): Promise<ScoringConfigResponse> {
    return httpClient.put<ScoringConfigResponse, ScoringWeights>("/trainsets/scoring-config", weights);
  }

  async resetScoringConfig(): Promise<ScoringConfigResponse> {
    return httpClient.post<ScoringConfigResponse>("/trainsets/scoring-config/reset");
  }

  // Ingestion Runs
  async listIngestionRuns(params?: any): Promise<IngestionRunListResponse> {
    return httpClient.get<IngestionRunListResponse>("/ingestion/runs", params);
  }

  async getIngestionRun(id?: string): Promise<IngestionRun> {
    return httpClient.get<IngestionRun>(`/ingestion/runs/${id}`);
  }

  async runNowMaximoJobCards(): Promise<any> {
    return httpClient.post<any>("/ingestion/run-now/maximo");
  }

  async runNowFitness(): Promise<any> {
    return httpClient.post<any>("/ingestion/run-now/fitness");
  }

  // Ingestion Notification Settings
  async getIngestionNotificationSettings(): Promise<IngestionNotificationSettingsResponse> {
    return httpClient.get<IngestionNotificationSettingsResponse>("/ingestion/notification-settings");
  }

  async updateIngestionNotificationSettings(payload: any): Promise<IngestionNotificationSettingsResponse> {
    return httpClient.put<IngestionNotificationSettingsResponse>("/ingestion/notification-settings", payload);
  }

  // Audit Logs
  async listAuditLogs(params?: any): Promise<AuditLogListResponse> {
    return httpClient.get<AuditLogListResponse>("/trainsets/audit", params);
  }
}
