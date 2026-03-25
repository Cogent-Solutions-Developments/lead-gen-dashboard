export type RunStatus =
  | "created"
  | "running"
  | "needs_user_input"
  | "completed"
  | "failed"
  | "cancelled";

export type TerminalRunStatus = "completed" | "failed" | "cancelled";

export type QueueStatus =
  | "queued"
  | "locked"
  | "sending"
  | "delivered_to_provider"
  | "retry"
  | "failed"
  | "dead_letter"
  | "confirmed_sent"
  | "confirmed_failed";

export type MissingFieldsMap = Record<string, string>;

export interface StartRunRequest {
  icp: string;
}

export interface StartRunResponse {
  run_id: string;
  status: RunStatus | string;
  stage: string;
}

export interface RunEvent {
  id?: string;
  stage?: string;
  status?: string;
  message?: string;
  payload?: unknown;
  created_at?: string;
}

export interface RunDetailResponse {
  id?: string;
  run_id?: string;
  pipeline?: string | null;
  status: RunStatus | string;
  stage?: string | null;
  missing_fields?: MissingFieldsMap | null;
  context?: Record<string, unknown> | null;
  events?: RunEvent[];
}

export interface SubmitAnswersRequest {
  answers: Record<string, string>;
}

export interface SubmitAnswersResponse {
  run_id?: string;
  status?: RunStatus | string;
  stage?: string;
  [key: string]: unknown;
}

export interface OutreachQueueRow {
  id: string;
  provider?: string | null;
  channel?: string | null;
  status?: QueueStatus | string | null;
  attempts?: number | null;
  max_attempts?: number | null;
  due_at?: string | null;
  provider_message_id?: string | null;
  callback_status?: string | null;
  last_error?: string | null;
}

export interface OutreachQueueResponse {
  run_id: string;
  total?: number;
  rows: OutreachQueueRow[];
}

export interface DispatchOutreachResponse {
  status?: string;
  message?: string;
  dispatched?: number;
  [key: string]: unknown;
}

export interface HealthResponse {
  status?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface ReadyResponse {
  status?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  error?: string;
  detail?: unknown;
  [key: string]: unknown;
}
