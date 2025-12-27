import type {
  AdminCredentials,
  AuthResponse,
  Decision,
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

export interface TrainsetService {
  listTrainsets(): Promise<Trainset[]>;
  getTrainset(id: string): Promise<Trainset>;
  updateDecision(id: string, payload: DecisionUpdatePayload): Promise<Trainset>;
  simulate(rules: SimulationRules): Promise<SimulationResult>;
  getScoredInduction(params?: any): Promise<ScoredInductionResponse>;
  getScoringConfig(): Promise<ScoringConfigResponse>;
  updateScoringConfig(weights: ScoringWeights): Promise<ScoringConfigResponse>;
  resetScoringConfig(): Promise<ScoringConfigResponse>;
  listIngestionRuns(params?: any): Promise<IngestionRunListResponse>;
  getIngestionRun(id?: string): Promise<IngestionRun>;
  runNowMaximoJobCards(): Promise<any>;
  runNowFitness(): Promise<any>;
  getIngestionNotificationSettings(): Promise<IngestionNotificationSettingsResponse>;
  updateIngestionNotificationSettings(payload: any): Promise<IngestionNotificationSettingsResponse>;
  listAuditLogs(params?: any): Promise<AuditLogListResponse>;
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
