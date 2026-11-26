import { apiClient } from "@/lib/apiClient";
import type { AdminEventItem } from "@/lib/auth";
import type { Persona } from "@/lib/persona";

export type CampaignReuseOptions = {
  events: AdminEventItem[];
  suggestedEventId: string | null;
  category: string | null;
  leadCount: number;
};

function campaignPath(id: string, persona: Persona) {
  const prefix = persona === "delegate-sales" ? "/api/delegate-sales"
    : persona === "delegates" ? "/api/delegates"
    : persona === "production" ? "/api/productions" : "/api";
  return `${prefix}/campaigns/${encodeURIComponent(id)}`;
}

export async function getCampaignReuseOptions(id: string, persona: Persona) {
  const { data } = await apiClient.get<CampaignReuseOptions>(`${campaignPath(id, persona)}/reuse-options`);
  return data;
}

export async function reuseCampaign(id: string, persona: Persona, payload: {
  eventRegistryId: string; category?: string; requestId: string;
}) {
  const { data } = await apiClient.post<{ id: string; reusedLeads: number }>(
    `${campaignPath(id, persona)}/reuse`, payload,
  );
  return data;
}
