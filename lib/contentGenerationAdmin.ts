import { getAuthHeader } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type ContentGenerationConfiguration = {
  maxLeadsPerRun: number;
  maxCampaignLeads: number;
  maxRequestsPerLead: number;
  maxTotalTokensPerRun: number;
  maxOutputTokens: number;
  maxToolCalls: number;
  maxCostPerLeadUsd: number;
  maxCampaignCostUsd: number;
  validatorModel: string;
  writerModel: string;
  qaModel: string;
  promptCacheEnabled: boolean;
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
    maximumCampaignBatches: number;
    pricingSnapshot: string;
  };
};

export type ContentGenerationConfigChange = {
  id: string;
  version: number;
  changedByUserId?: string | null;
  changedByUsername: string;
  previousValues: Record<string, unknown>;
  currentValues: Record<string, unknown>;
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
    estimatedCostMicrousd: number;
    estimatedCostUsd: number;
    costLimitMicrousd: number;
    costLimitUsd: number;
    costUtilization: number;
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
    estimatedCostMicrousd: number;
    estimatedCostUsd: number;
    cachedInputRate: number;
    requestBudgetUtilization: number;
    tokenBudgetUtilization: number;
    costBudgetUtilization: number;
  };
  dailyUsage: Array<{
    date: string;
    runs: number;
    requests: number;
    tokens: number;
    estimatedCostMicrousd: number;
    estimatedCostUsd: number;
    budgetStops: number;
  }>;
  stateDistribution: Array<{ state: string; count: number }>;
  pipelineDistribution: Array<{ pipeline: string; count: number }>;
  activeStageFlow: Array<{ stage: string; state: string; count: number }>;
  activeCheckpoints: Array<{ node: string; state: string; count: number }>;
  activeBatches: Array<{ state: string; count: number }>;
  recentRuns: ContentGenerationRun[];
};

export type ContentGenerationUsageSnapshot = {
  requests: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  toolCalls: number;
  estimatedCostMicrousd: number;
};

export type ContentGenerationBatch = {
  id: string;
  number: number;
  leadCount: number;
  state: string;
  attempts: number;
  usage: Partial<{
    startedWith: ContentGenerationUsageSnapshot;
    finishedWith: ContentGenerationUsageSnapshot;
    delta: ContentGenerationUsageSnapshot;
  }>;
  error: string;
  startedAt?: string | null;
  updatedAt?: string | null;
  finishedAt?: string | null;
};

export type ContentGenerationRunDetails = {
  run: ContentGenerationRun;
  tracking: {
    leadStates: Record<string, number>;
    batches: {
      total: number;
      states: Record<string, number>;
      items: ContentGenerationBatch[];
    };
    checkpointStates: Record<string, number>;
  };
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

export function getContentGenerationRunDetails(jobId: string) {
  return adminRequest<ContentGenerationRunDetails>(
    `/api/admin/content-generation/runs/${encodeURIComponent(jobId)}`,
  );
}
