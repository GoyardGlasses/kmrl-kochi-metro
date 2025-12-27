import type {
  AdminCredentials,
  AuthResponse,
  Decision,
  DecisionUpdatePayload,
  SimulationResult,
  SimulationRules,
  Trainset,
  AuditLogListResponse,
  ScoredInductionResponse,
  ScoringWeights,
  ScoringConfigResponse,
  IngestionRunListResponse,
  IngestionRun,
  IngestionRunNowResponse,
  IngestionNotificationSettingsResponse,
} from "@/types";

export interface TrainsetService {
  listTrainsets(): Promise<Trainset[]>;
  getTrainset(id: string): Promise<Trainset>;
  updateDecision(id: string, payload: DecisionUpdatePayload): Promise<Trainset>;
  simulate(rules: SimulationRules): Promise<SimulationResult>;
  listAuditLogs(params?: {
    limit?: number;
    skip?: number;
    action?: string;
    trainsetId?: string;
  }): Promise<AuditLogListResponse>;
  getScoredInduction(params?: {
    limit?: number;
    skip?: number;
    decision?: string;
    brandingPriority?: string;
    cleaningStatus?: string;
    jobCardOpen?: boolean;
    minScore?: number;
    weights?: Partial<ScoringWeights>;
  }): Promise<ScoredInductionResponse>;

  getScoringConfig(): Promise<ScoringConfigResponse>;
  updateScoringConfig(weights: ScoringWeights): Promise<ScoringConfigResponse>;
  resetScoringConfig(): Promise<ScoringConfigResponse>;

  listIngestionRuns(params?: { limit?: number; skip?: number; source?: string; status?: string }): Promise<IngestionRunListResponse>;

  getIngestionRun(id: string): Promise<IngestionRun>;
  runNowMaximoJobCards(): Promise<IngestionRunNowResponse>;
  runNowFitness(): Promise<IngestionRunNowResponse>;
  getIngestionNotificationSettings(): Promise<IngestionNotificationSettingsResponse>;
  updateIngestionNotificationSettings(payload: {
    email: string;
    phone: string;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  }): Promise<IngestionNotificationSettingsResponse>;
}

export interface AuthService {
  login(credentials: AdminCredentials): Promise<AuthResponse>;
  signup(credentials: AdminCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refresh(): Promise<AuthResponse | null>;
}

export interface ApiServices {
  trainsets: TrainsetService;
  auth: AuthService;
}
