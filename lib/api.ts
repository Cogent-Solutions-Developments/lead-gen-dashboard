import axios from "axios";
import { apiClient } from "./apiClient";


export type DashboardStats = {
  activeCampaigns: number;
  totalLeads: number;
  pendingReview: number;
  leadsContacted: number;
};

export type RecentCampaign = {
  id: string;
  name: string;
  leadsCount: number;
  status: string;
};

export type CampaignListItem = {
  id: string;
  name: string;
  icpPreview: string;
  status: string;
  progress: number;
  totalLeads: number;
  toApprove: number;
  createdAt: string;
};

export type CampaignDetail = {
  id: string;
  name: string;
  icpPreview: string;
  status: string;
  createdAt: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export type CreateCampaignRequest = {
  icp: string;
  name?: string;
  location?: string;
  date?: string;
  category?: string;
};

export type LeadItem = {
  id: string;
  batchId: string;
  employeeName: string;
  title: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  companyUrl: string | null;
  contentEmailSubject: string | null;
  contentEmail: string | null;
  contentLinkedin: string | null;
  contentWhatsapp: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
};

export async function getDashboardStats() {
  const { data } = await apiClient.get<DashboardStats>("/api/dashboard/stats");
  return data;
}

export async function getDashboardDistribution() {
  const { data } = await apiClient.get("/api/dashboard/distribution");
  return data as { total: number; contacted: number; pending: number; other: number };
}

export async function getRecentCampaigns(limit = 5) {
  const { data } = await apiClient.get<{ campaigns: RecentCampaign[] }>(
    "/api/campaigns/recent",
    { params: { limit } }
  );
  return data;
}

export async function listCampaigns(params: { status?: string; limit?: number; offset?: number }) {
  const { data } = await apiClient.get<{ campaigns: CampaignListItem[]; total: number; hasMore: boolean }>(
    "/api/campaigns",
    { params }
  );
  return data;
}

export async function createCampaign(payload: string | CreateCampaignRequest) {
  const requestBody = typeof payload === "string" ? { icp: payload } : payload;

  const { data } = await apiClient.post<{
    id: string;
    name: string;
    icpPreview: string;
    status: string;
    progress: number;
    createdAt: string;
  }>("/api/campaigns", requestBody);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await apiClient.get<CampaignDetail>(`/api/campaigns/${id}`);
  return data;
}

export async function getCampaignLeads(id: string, status: string = "all") {
  const { data } = await apiClient.get<{ leads: LeadItem[]; total: number }>(
    `/api/campaigns/${id}/leads`,
    { params: { status } }
  );
  return data;
}

export async function approveLead(id: string) {
  const { data } = await apiClient.put(`/api/leads/${id}/approve`);
  return data;
}

export async function rejectLead(id: string) {
  const { data } = await apiClient.put(`/api/leads/${id}/reject`);
  return data;
}

export async function updateLeadContent(id: string, payload: {
  contentEmailSubject: string;
  contentEmail: string;
  contentLinkedin: string;
  contentWhatsapp: string;
}) {
  const { data } = await apiClient.put(`/api/leads/${id}/content`, payload);
  return data;
}

export async function approveAllCampaign(id: string) {
  const { data } = await apiClient.put(`/api/campaigns/${id}/approve-all`);
  return data;
}

export async function startOutreach(id: string) {
  const { data } = await apiClient.post(`/api/campaigns/${id}/start-outreach`);
  return data;
}

export function exportCampaignCsvUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/campaigns/${id}/export`;
}

export async function stopCampaign(id: string) {
  const { data } = await apiClient.post(`/api/campaigns/${id}/stop`);
  return data as { campaignId: string; status: string; message: string };
}




export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});
