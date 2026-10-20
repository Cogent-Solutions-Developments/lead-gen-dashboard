import { apiClient } from "@/lib/apiClient";
import type { OutreachAction, OutreachConfiguration, OutreachDepartment } from "@/lib/automatedOutreach";

export const OUTREACH_API = "/api/admin/automated-outreach";

export async function controlOutreach(id: string, action: OutreachAction) {
  return (await apiClient.post(`${OUTREACH_API}/leads/${encodeURIComponent(id)}/control`, { action })).data;
}

export type OutreachContentUpdate = Pick<OutreachConfiguration,
  "revision" | "model" | "prompt" | "reasoningEffort" | "maxOutputTokens" | "plannerModel" | "writerModel" | "reviewerModel" | "maxRequests" | "maxTokens" | "maxContextChars">;

export type OutreachDeliveryUpdate = Pick<OutreachConfiguration, "revision" | "enabled">;

export async function saveOutreachContentConfiguration(payload: OutreachContentUpdate) {
  return (await apiClient.put<OutreachConfiguration>(`${OUTREACH_API}/configuration/content`, payload)).data;
}

export async function saveOutreachDeliveryConfiguration(payload: OutreachDeliveryUpdate) {
  return (await apiClient.put<OutreachConfiguration>(`${OUTREACH_API}/configuration/delivery`, payload)).data;
}

export async function setEventOutreach(department: OutreachDepartment, eventKey: string, enabled: boolean, revision: number) {
  return (await apiClient.put(`${OUTREACH_API}/event-outreach`, { department, eventKey, enabled, revision })).data;
}
export async function recoverStatusOutreachRun(id: string) {
  return (await apiClient.post(`${OUTREACH_API}/content/runs/${encodeURIComponent(id)}/recover`, {})).data;
}

export async function prepareOutreachContent(id: string, retry = false) {
  try {
    return (await apiClient.post(`${OUTREACH_API}/leads/${encodeURIComponent(id)}/content`, { retry })).data;
  } catch (error) {
    const detail = (error as { data?: { detail?: unknown } })?.data?.detail;
    if (typeof detail === "string") throw new Error(detail);
    throw error;
  }
}