export type IngestionSource = "MAXIMO_JOB_CARDS" | "FITNESS" | "UNS_FITNESS";
export type IngestionStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface IngestionRun {
  _id: string;
  source: IngestionSource;
  status: IngestionStatus;
  startedAt: string;
  finishedAt?: string;
  recordsRead?: number;
  recordsUpserted?: number;
  trainsetsUpdated?: number;
  error?: string;
  metadata?: any;
  createdAt?: string;
}

export interface IngestionRunListResponse {
  runs: IngestionRun[];
  skip: number;
  limit: number;
}

export interface IngestionRunNowResponse {
  ingestionRunId: string;
}

export interface IngestionNotificationSettingsResponse {
  key: "default";
  email: string;
  phone: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  updatedBy?: string;
  updatedAt?: string;
}
