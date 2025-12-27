export type AuditAction = "UPDATE_DECISION" | "SIMULATE";

export interface AuditLogEntry {
  _id: string;
  action: AuditAction;
  actorEmail?: string;
  actorId?: string;
  trainsetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  skip: number;
  limit: number;
}
