import { apiClient } from "@/lib/apiClient";
import { getPersona } from "@/lib/persona";

export type GenerationJob = {
  id: string;
  state: string;
  pct: number;
  message?: string;
  pause_requested?: boolean;
  budget_exhausted?: boolean;
  leadStates?: Record<string, number>;
};

function campaignPath(campaignId: string) {
  const persona = getPersona();
  const prefix = persona === "delegates" ? "/api/delegates" : persona === "production" ? "/api/productions" : "/api";
  return `${prefix}/campaigns/${encodeURIComponent(campaignId)}/content`;
}

export async function getActiveGenerationJob(campaignId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<{ job: GenerationJob | null }>(`${campaignPath(campaignId)}/active-job`, { signal });
  return data.job;
}

export async function getGenerationJob(campaignId: string, jobId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<GenerationJob>(`${campaignPath(campaignId)}/jobs/${encodeURIComponent(jobId)}`, { signal });
  return data;
}

export async function controlGenerationJob(campaignId: string, jobId: string, action: "pause" | "resume" | "cancel") {
  const { data } = await apiClient.post(`${campaignPath(campaignId)}/jobs/${encodeURIComponent(jobId)}/${action}`);
  return data;
}
