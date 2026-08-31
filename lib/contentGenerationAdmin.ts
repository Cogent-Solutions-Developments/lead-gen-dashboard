import { getAuthHeader } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type ContentGenerationConfiguration = {
  maxLeadsPerRun: number;
  maxRequestsPerLead: number;
  maxTotalTokensPerRun: number;
  maxOutputTokens: number;
  maxToolCalls: number;
  checkpointRetentionDays: number;
  leadLeaseSeconds: number;
  runLeaseSeconds: number;
  version: number;
  updatedByUserId?: string | null;
  updatedByUsername: string;
  updatedAt?: string | null;
  derivedLimits: {
    maxProviderRequestsPerRun: number;
    maxTheoreticalOutputTokens: number;
  };
};

export type ContentGenerationConfigChange = {
  id: string;
  version: number;
  changedByUserId?: string | null;
  changedByUsername: string;
  previousValues: Record<string, number>;
  currentValues: Record<string, number>;
  createdAt?: string | null;
};

export type ContentGenerationConfigurationResponse = {
  configuration: ContentGenerationConfiguration;
  recentChanges?: ContentGenerationConfigChange[];
  message?: string;
};

export type ContentGenerationRun = {
  id: string;
  campaignId: string;
  type: string;
  pipeline: string;
  state: string;
  progress: number;
  step: string;
  message: string;
  requestedLeads: number;
  configurationVersion?: number | null;
  pauseRequested: boolean;
  budgetExhausted: boolean;
  usage: {
    requests: number;
    requestLimit: number;
    requestUtilization: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    tokenLimit: number;
    tokenUtilization: number;
    toolCalls: number;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
  finishedAt?: string | null;
};

export type ContentGenerationOverview = {
  generatedAt?: string | null;
  windowDays: number;
  summary: {
    totalRuns: number;
    activeRuns: number;
    successfulRuns: number;
    failedRuns: number;
    cancelledRuns: number;
    pausedRuns: number;
    budgetStops: number;
    requests: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolCalls: number;
    cachedInputRate: number;
    requestBudgetUtilization: number;
    tokenBudgetUtilization: number;
  };
  dailyUsage: Array<{
    date: string;
    runs: number;
    requests: number;
    tokens: number;
    budgetStops: number;
  }>;
  stateDistribution: Array<{ state: string; count: number }>;
  pipelineDistribution: Array<{ pipeline: string; count: number }>;
  activeStageFlow: Array<{ stage: string; state: string; count: number }>;
  activeCheckpoints: Array<{ node: string; state: string; count: number }>;
  recentRuns: ContentGenerationRun[];
};

export type ContentGenerationConfigurationUpdate = Omit<
  ContentGenerationConfiguration,
  "version" | "updatedByUserId" | "updatedByUsername" | "updatedAt" | "derivedLimits"
> & { expectedVersion: number };

function apiBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return base.replace(/\/+$/, "");
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(),
      ...getLocalDevNgrokHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) throw new Error("The content generation API returned an invalid response.");
    }
  }
  if (response.ok) return data as T;
  const detail = data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
    ? data.detail
    : response.statusText || "Request failed";
  const error = new Error(detail) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

export function getContentGenerationConfiguration() {
  return adminRequest<ContentGenerationConfigurationResponse>(
    "/api/admin/content-generation/configuration",
  );
}

export function updateContentGenerationConfiguration(payload: ContentGenerationConfigurationUpdate) {
  return adminRequest<ContentGenerationConfigurationResponse>(
    "/api/admin/content-generation/configuration",
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function getContentGenerationOverview(days = 14, recentLimit = 8) {
  const query = new URLSearchParams({ days: String(days), recentLimit: String(recentLimit) });
  return adminRequest<ContentGenerationOverview>(
    `/api/admin/content-generation/overview?${query.toString()}`,
  );
}
