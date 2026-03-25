import type {
  ApiErrorPayload,
  DispatchOutreachResponse,
  HealthResponse,
  OutreachQueueResponse,
  ReadyResponse,
  RunDetailResponse,
  StartRunRequest,
  StartRunResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
} from "@/features/agentic-nizo/api/types";

const DEFAULT_AGENTIC_NIZO_API_BASE_URL = "http://localhost:8090";
const RUNS_API_PREFIX = "/api/v1";
const LOG_PREFIX = "[Agentic Nizo Frontend]";

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  invalid_api_key: "Invalid or missing run token. Set NEXT_PUBLIC_AGENTIC_NIZO_RUN_TOKEN.",
  invalid_run_id: "Run ID format is invalid. Start a new run or check the URL query value.",
  run_not_found: "Run not found. It may be deleted or the ID may be incorrect.",
  callback_not_configured: "Backend callbacks are not configured yet. Check backend readiness/env settings.",
};

interface RequestOptions extends RequestInit {
  requiresApiKey?: boolean;
  withJsonBody?: boolean;
}

interface AgenticApiErrorArgs {
  status: number;
  message: string;
  code?: string;
  detail?: unknown;
  raw?: unknown;
}

export class AgenticApiError extends Error {
  status: number;
  code?: string;
  detail?: unknown;
  raw?: unknown;

  constructor({ status, message, code, detail, raw }: AgenticApiErrorArgs) {
    super(message);
    this.name = "AgenticApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.raw = raw;
  }
}

function resolveApiBaseUrl() {
  const rawBaseUrl = (process.env.NEXT_PUBLIC_AGENTIC_NIZO_API_BASE_URL || DEFAULT_AGENTIC_NIZO_API_BASE_URL).trim();
  return rawBaseUrl.replace(/\/+$/, "");
}

function resolveRunToken() {
  return (process.env.NEXT_PUBLIC_AGENTIC_NIZO_RUN_TOKEN || "").trim();
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function extractErrorCode(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const directCode = payload.code;
  if (typeof directCode === "string" && directCode) return directCode;

  const directError = payload.error;
  if (typeof directError === "string" && directError) return directError;

  const detail = payload.detail;
  if (isRecord(detail)) {
    if (typeof detail.code === "string" && detail.code) return detail.code;
    if (typeof detail.error === "string" && detail.error) return detail.error;
  }

  return undefined;
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload) return payload;
  if (!isRecord(payload)) return undefined;

  if (typeof payload.message === "string" && payload.message) return payload.message;
  if (typeof payload.error === "string" && payload.error) return payload.error;
  if (typeof payload.detail === "string" && payload.detail) return payload.detail;

  const detail = payload.detail;
  if (isRecord(detail)) {
    if (typeof detail.message === "string" && detail.message) return detail.message;
    if (typeof detail.error === "string" && detail.error) return detail.error;
  }

  return undefined;
}

function extractErrorDetail(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const detail = payload.detail;
  if (detail === undefined) return payload;
  return detail;
}

function toFriendlyMessage(status: number, code: string | undefined, fallback: string): string {
  if (code && FRIENDLY_ERROR_MESSAGES[code]) return FRIENDLY_ERROR_MESSAGES[code];
  if (status === 403) return FRIENDLY_ERROR_MESSAGES.invalid_api_key;
  if (status === 404) return FRIENDLY_ERROR_MESSAGES.run_not_found;
  if (status === 503) return "Backend is not ready yet. Start the stack and verify readiness settings.";
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { requiresApiKey = true, withJsonBody = false, ...init } = options;

  const runToken = resolveRunToken();
  if (requiresApiKey && !runToken) {
    throw new AgenticApiError({
      status: 403,
      code: "invalid_api_key",
      message: FRIENDLY_ERROR_MESSAGES.invalid_api_key,
      detail: "NEXT_PUBLIC_AGENTIC_NIZO_RUN_TOKEN is empty.",
    });
  }

  const url = buildUrl(path);
  const headers = new Headers(init.headers || {});

  headers.set("accept", "application/json");
  if (withJsonBody) {
    headers.set("content-type", "application/json");
  }
  if (requiresApiKey && runToken) {
    headers.set("x-api-key", runToken);
  }

  const method = init.method || "GET";
  console.groupCollapsed(`${LOG_PREFIX} ${method} ${path}`);
  if (init.body) {
    console.log("request body", init.body);
  }
  console.log("request url", url);
  console.groupEnd();

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const rawText = await response.text();
  const payload = rawText ? safeJsonParse(rawText) : {};

  console.groupCollapsed(`${LOG_PREFIX} response ${response.status} ${path}`);
  console.log("response payload", payload);
  console.groupEnd();

  if (!response.ok) {
    const code = extractErrorCode(payload);
    const fallback = extractErrorMessage(payload) || `Request failed with status ${response.status}.`;
    const message = toFriendlyMessage(response.status, code, fallback);
    throw new AgenticApiError({
      status: response.status,
      code,
      message,
      detail: extractErrorDetail(payload),
      raw: payload,
    });
  }

  return payload as T;
}

export function toAgenticApiError(error: unknown): AgenticApiError {
  if (error instanceof AgenticApiError) return error;
  if (error instanceof Error) {
    return new AgenticApiError({
      status: 500,
      message: error.message,
      raw: error,
    });
  }
  return new AgenticApiError({
    status: 500,
    message: "Unexpected error.",
    raw: error,
  });
}

export async function startRun(body: StartRunRequest): Promise<StartRunResponse> {
  return request<StartRunResponse>(`${RUNS_API_PREFIX}/runs`, {
    method: "POST",
    withJsonBody: true,
    body: JSON.stringify(body),
  });
}

export async function getRunDetail(runId: string): Promise<RunDetailResponse> {
  return request<RunDetailResponse>(`${RUNS_API_PREFIX}/runs/${encodeURIComponent(runId)}`);
}

export async function submitRunAnswers(
  runId: string,
  body: SubmitAnswersRequest,
): Promise<SubmitAnswersResponse> {
  return request<SubmitAnswersResponse>(`${RUNS_API_PREFIX}/runs/${encodeURIComponent(runId)}/answers`, {
    method: "POST",
    withJsonBody: true,
    body: JSON.stringify(body),
  });
}

export async function getOutreachQueue(runId: string): Promise<OutreachQueueResponse> {
  return request<OutreachQueueResponse>(`${RUNS_API_PREFIX}/runs/${encodeURIComponent(runId)}/outreach/queue`);
}

export async function dispatchOutreachQueue(runId: string): Promise<DispatchOutreachResponse> {
  return request<DispatchOutreachResponse>(`${RUNS_API_PREFIX}/runs/${encodeURIComponent(runId)}/outreach/dispatch`, {
    method: "POST",
    withJsonBody: true,
    body: JSON.stringify({}),
  });
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/healthz", { requiresApiKey: false });
}

export async function getReadiness(): Promise<ReadyResponse> {
  return request<ReadyResponse>("/readyz", { requiresApiKey: false });
}

export function parseApiErrorPayload(value: unknown): ApiErrorPayload | undefined {
  if (!isRecord(value)) return undefined;
  return value as ApiErrorPayload;
}
