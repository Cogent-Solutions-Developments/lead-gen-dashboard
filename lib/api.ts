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

export type MessageChannel = "email" | "whatsapp" | "linkedin" | "other";

export type MessageDeliveryStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "replied";

export type MessageRecipient = {
  leadId: string | null;
  leadName: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
};

export type ReplyNotification = {
  id: string;
  campaignId: string | null;
  messageId: string | null;
  channel: MessageChannel | string;
  text: string;
  receivedAt: string;
  isRead: boolean;
  recipient: MessageRecipient;
};

export type MessageStatus = {
  id: string;
  campaignId: string | null;
  leadId: string | null;
  channel: MessageChannel | string;
  status: MessageDeliveryStatus | string;
  sentAt: string | null;
  deliveredAt: string | null;
  repliedAt: string | null;
  failedReason: string | null;
};

export type WhatsAppInbound = {
  id: string;
  providerMessageId: string | null;
  fromPhone: string | null;
  contactName: string | null;
  messageType: string | null;
  text: string | null;
  contextMessageId: string | null;
  sendQueueId: string | null;
  personId: string | null;
  receivedAt: string;
};

export type WhatsAppInboundEvent = {
  type: string;
  inbound?: WhatsAppInbound;
};

type SubscribeWhatsAppEventsOptions = {
  onOpen?: () => void;
  onError?: () => void;
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

export async function listReplyNotifications(params?: {
  campaignId?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const { data } = await apiClient.get<{
    replies: ReplyNotification[];
    total: number;
    unread: number;
  }>("/api/messages/replies", {
    params,
  });
  return data;
}

export async function listMessageStatuses(params?: {
  campaignId?: string;
  leadId?: string;
  limit?: number;
}) {
  const { data } = await apiClient.get<{
    statuses: MessageStatus[];
  }>("/api/messages/status", {
    params,
  });
  return data;
}

export async function markReplyAsRead(id: string) {
  const { data } = await apiClient.put<{
    id: string;
    isRead: boolean;
  }>(`/api/messages/replies/${id}/read`);
  return data;
}

// Backend contract:
// GET /api/whatsapp/inbound?person_id=...&limit=...
export async function fetchInbound(personId: string, limit = 50) {
  const url = `/api/whatsapp/inbound?person_id=${encodeURIComponent(personId)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch inbound messages (${res.status})`);
  }

  const data = await res.json();
  return (data?.messages || []) as WhatsAppInbound[];
}

// Backend contract:
// SSE /api/whatsapp/events with payload type=whatsapp_inbound
export function subscribeWhatsAppEvents(
  onMessage: (inbound: WhatsAppInbound) => void,
  options?: SubscribeWhatsAppEventsOptions
) {
  if (typeof window === "undefined") return () => {};

  const es = new EventSource("/api/whatsapp/events", {
    withCredentials: false,
  });

  es.onopen = () => {
    options?.onOpen?.();
  };

  es.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data) as WhatsAppInboundEvent;
      if (payload.type === "whatsapp_inbound" && payload.inbound) {
        onMessage(payload.inbound);
      }
    } catch (error) {
      console.error("Bad SSE JSON", error, evt.data);
    }
  };

  es.onerror = () => {
    options?.onError?.();
    console.warn("SSE disconnected", { readyState: es.readyState, url: es.url });
  };

  return () => es.close();
}




export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});
