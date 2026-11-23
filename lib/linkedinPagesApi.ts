import { apiClient } from "@/lib/apiClient";
import type { LinkedInPage, LinkedInPageInput, LinkedInCampaign, LinkedInCampaignList, LinkedInCampaignDetail } from "@/lib/linkedinPages";

const LINKEDIN_PAGES_API = "/api/admin/linkedin-pages";

export async function listLinkedInPages(signal?: AbortSignal) {
  const { data } = await apiClient.get<{ items: LinkedInPage[]; total: number }>(LINKEDIN_PAGES_API, { signal });
  return data.items;
}

export async function getLinkedInPage(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<{ page: LinkedInPage }>(`${LINKEDIN_PAGES_API}/${encodeURIComponent(id)}`, { signal });
  return data.page;
}

export async function createLinkedInPage(payload: LinkedInPageInput) {
  const { data } = await apiClient.post<{ page: LinkedInPage }>(LINKEDIN_PAGES_API, payload);
  return data.page;
}

function campaignsUrl(pageId: string) {
  return `${LINKEDIN_PAGES_API}/${encodeURIComponent(pageId)}/campaigns`;
}

export async function listLinkedInCampaigns(pageId: string, params: { limit: number; offset: number }, signal?: AbortSignal) {
  const { data } = await apiClient.get<LinkedInCampaignList>(campaignsUrl(pageId), { params, signal });
  return data;
}

export async function uploadLinkedInCampaign(pageId: string, name: string, file: File, eventKey?: string) {
  const form = new FormData();
  form.append("name", name.trim());
  form.append("leadSheet", file);
  if (eventKey) form.append("eventKey", eventKey);
  const { data } = await apiClient.post<{ campaign: LinkedInCampaign }>(campaignsUrl(pageId), form);
  return data.campaign;
}

export async function getLinkedInCampaign(pageId: string, campaignId: string, params: { limit: number; offset: number }, signal?: AbortSignal) {
  const { data } = await apiClient.get<LinkedInCampaignDetail>(`${campaignsUrl(pageId)}/${encodeURIComponent(campaignId)}`, { params, signal });
  return data;
}

export async function updateLinkedInCampaignEvent(pageId: string, campaignId: string, eventKey: string | null) {
  const { data } = await apiClient.put<{ campaign: LinkedInCampaign }>(`${campaignsUrl(pageId)}/${encodeURIComponent(campaignId)}/event`, { eventKey });
  return data.campaign;
}
