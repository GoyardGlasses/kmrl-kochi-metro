import type {
  DecisionUpdatePayload,
  Trainset,
  SimulationRules,
  SimulationResult,
  AuditLogListResponse,
  ScoredInductionResponse,
  ScoringWeights,
  ScoringConfigResponse,
  IngestionRunListResponse,
  IngestionRun,
  IngestionRunNowResponse,
  IngestionNotificationSettingsResponse,
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

  async listAuditLogs(params?: {
    limit?: number;
    skip?: number;
    action?: string;
    trainsetId?: string;
  }): Promise<AuditLogListResponse> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.action) qs.set("action", params.action);
    if (params?.trainsetId) qs.set("trainsetId", params.trainsetId);

    const suffix = qs.toString();
    return httpClient.get<AuditLogListResponse>(`/trainsets/audit${suffix ? `?${suffix}` : ""}`);
  }

  async getScoredInduction(params?: {
    limit?: number;
    skip?: number;
    decision?: string;
    brandingPriority?: string;
    cleaningStatus?: string;
    jobCardOpen?: boolean;
    minScore?: number;
    weights?: Partial<ScoringWeights>;
  }): Promise<ScoredInductionResponse> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.decision) qs.set("decision", params.decision);
    if (params?.brandingPriority) qs.set("brandingPriority", params.brandingPriority);
    if (params?.cleaningStatus) qs.set("cleaningStatus", params.cleaningStatus);
    if (params?.jobCardOpen !== undefined) qs.set("jobCardOpen", String(params.jobCardOpen));
    if (params?.minScore !== undefined) qs.set("minScore", String(params.minScore));

    if (params?.weights) {
      for (const [k, v] of Object.entries(params.weights)) {
        if (v === undefined || v === null) continue;
        qs.set(`w_${k}`, String(v));
      }
    }
    const suffix = qs.toString();
    return httpClient.get<ScoredInductionResponse>(`/trainsets/scored-induction${suffix ? `?${suffix}` : ""}`);
  }

  async getScoringConfig(): Promise<ScoringConfigResponse> {
    return httpClient.get<ScoringConfigResponse>("/config/scoring");
  }

  async updateScoringConfig(weights: ScoringWeights): Promise<ScoringConfigResponse> {
    return httpClient.put<ScoringConfigResponse, { weights: ScoringWeights }>("/config/scoring", { weights });
  }

  async resetScoringConfig(): Promise<ScoringConfigResponse> {
    return httpClient.delete<ScoringConfigResponse>("/config/scoring");
  }

  async listIngestionRuns(params?: {
    limit?: number;
    skip?: number;
    source?: string;
    status?: string;
  }): Promise<IngestionRunListResponse> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.source) qs.set("source", params.source);
    if (params?.status) qs.set("status", params.status);
    const suffix = qs.toString();
    return httpClient.get<IngestionRunListResponse>(`/ingest/runs${suffix ? `?${suffix}` : ""}`);
  }

  async getIngestionRun(id: string): Promise<IngestionRun> {
    return httpClient.get<IngestionRun>(`/ingest/runs/${id}`);
  }

  async runNowMaximoJobCards(): Promise<IngestionRunNowResponse> {
    return httpClient.post<IngestionRunNowResponse>("/ingest/run-now/maximo-jobcards");
  }

  async runNowFitness(): Promise<IngestionRunNowResponse> {
    return httpClient.post<IngestionRunNowResponse>("/ingest/run-now/fitness");
  }

  async getIngestionNotificationSettings(): Promise<IngestionNotificationSettingsResponse> {
    return httpClient.get<IngestionNotificationSettingsResponse>("/config/ingestion-notifications");
  }

  async updateIngestionNotificationSettings(payload: {
    email: string;
    phone: string;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  }): Promise<IngestionNotificationSettingsResponse> {
    return httpClient.put<IngestionNotificationSettingsResponse, typeof payload>("/config/ingestion-notifications", payload);
  }
}
