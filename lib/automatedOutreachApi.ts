import { apiClient } from "@/lib/apiClient";
import type { OutreachAction, OutreachConfiguration, OutreachDepartment } from "@/lib/automatedOutreach";

export const OUTREACH_API = "/api/admin/automated-outreach";

export async function controlOutreach(id: string, action: OutreachAction) {
  return (await apiClient.post(`${OUTREACH_API}/leads/${encodeURIComponent(id)}/control`, { action })).data;
}

export type OutreachContentUpdate = Pick<OutreachConfiguration,
  "revision" | "model" | "prompt" | "reasoningEffort" | "maxOutputTokens">;

export type OutreachDeliveryUpdate = Pick<OutreachConfiguration,
  "revision" | "enabled" | "senderName" | "senderEmail" | "callbackBaseUrl"> & {
  webhooks: Partial<Record<OutreachDepartment, string | null>>;
  callbackSecret: string;
  clearCallbackSecret: boolean;
};

export async function saveOutreachContentConfiguration(payload: OutreachContentUpdate) {
  return (await apiClient.put<OutreachConfiguration>(`${OUTREACH_API}/configuration/content`, payload)).data;
}

export async function saveOutreachDeliveryConfiguration(payload: OutreachDeliveryUpdate) {
  return (await apiClient.put<OutreachConfiguration>(`${OUTREACH_API}/configuration/delivery`, payload)).data;
}
