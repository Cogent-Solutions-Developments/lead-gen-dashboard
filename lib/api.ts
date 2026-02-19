import axios from "axios";
import { apiClient } from "./apiClient";

const waDebugEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_WA_DEBUG === "1" ||
  (process.env.NEXT_PUBLIC_WA_DEBUG || "").toLowerCase() === "true";

function waDebugLog(event: string, payload?: unknown) {
  if (!waDebugEnabled || typeof window === "undefined") return;
  if (typeof payload === "undefined") {
    console.log(`[WA] ${event}`);
    return;
  }
  console.log(`[WA] ${event}`, payload);
}


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

export type WhatsAppMessagesResponse = {
  ok?: boolean;
  personId?: string;
  messages: WhatsAppInbound[];
  nextSince: string | null;
};

export type WhatsAppNotificationsResponse = {
  ok?: boolean;
  notifications: WhatsAppInbound[];
};

type FetchMessagesParams = {
  personId: string;
  since?: string | null;
  limit?: number;
};

type StartWhatsAppPollingOptions = {
  onPollSuccess?: (data: WhatsAppMessagesResponse) => void;
  onError?: (error: unknown) => void;
};

function getWhatsAppBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return base.replace(/\/+$/, "");
}

function getWhatsAppHeaders() {
  const apiKey = (process.env.NEXT_PUBLIC_API_KEY || "").trim();
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
}

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
// GET /api/whatsapp/messages?person_id=<uuid>&since=<iso>&limit=50
export async function fetchMessages(params: FetchMessagesParams) {
  const { personId, since = null, limit = 50 } = params;
  const base = getWhatsAppBaseUrl();
  const headers = getWhatsAppHeaders();

  const url = new URL(`${base}/api/whatsapp/messages`);
  url.searchParams.set("person_id", personId);
  url.searchParams.set("limit", String(limit));
  if (since) url.searchParams.set("since", since);

  waDebugLog("fetchMessages.request", {
    personId,
    since,
    limit,
    url: url.toString(),
    hasApiKey: Boolean(headers["x-api-key"]),
  });

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    waDebugLog("fetchMessages.error", { status: res.status });
    throw new Error(`messages fetch failed ${res.status}`);
  }

  const data = await res.json();
  const result = {
    ok: data?.ok,
    personId: data?.personId,
    messages: Array.isArray(data?.messages) ? (data.messages as WhatsAppInbound[]) : [],
    nextSince: typeof data?.nextSince === "string" ? data.nextSince : null,
  } as WhatsAppMessagesResponse;
  waDebugLog("fetchMessages.response", {
    personId: result.personId ?? personId,
    count: result.messages.length,
    nextSince: result.nextSince,
  });
  return result;
}

// Backward compatibility alias.
export async function fetchInbound(personId: string, limit = 50) {
  const data = await fetchMessages({ personId, since: null, limit });
  return data.messages;
}

// GET /api/whatsapp/notifications?limit=50&unread_only=true
export async function fetchWhatsAppNotifications(params?: { limit?: number; unreadOnly?: boolean }) {
  const base = getWhatsAppBaseUrl();
  const headers = getWhatsAppHeaders();
  const url = new URL(`${base}/api/whatsapp/notifications`);
  url.searchParams.set("limit", String(params?.limit ?? 50));
  if (params?.unreadOnly) url.searchParams.set("unread_only", "true");

  waDebugLog("fetchWhatsAppNotifications.request", {
    url: url.toString(),
    hasApiKey: Boolean(headers["x-api-key"]),
    unreadOnly: Boolean(params?.unreadOnly),
  });

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    waDebugLog("fetchWhatsAppNotifications.error", { status: res.status });
    throw new Error(`notifications fetch failed ${res.status}`);
  }

  const data = await res.json();
  const result = {
    ok: data?.ok,
    notifications: Array.isArray(data?.notifications)
      ? (data.notifications as WhatsAppInbound[])
      : [],
  } as WhatsAppNotificationsResponse;

  waDebugLog("fetchWhatsAppNotifications.response", { count: result.notifications.length });
  return result;
}

// Poll /messages every 2s and append only new messages.
export function startWhatsAppPolling(
  personId: string,
  onNewMessages: (messages: WhatsAppInbound[]) => void,
  options?: StartWhatsAppPollingOptions
) {
  let nextSince: string | null = null;
  let stopped = false;
  let tickCount = 0;

  waDebugLog("poll.start", { personId });

  const tick = async () => {
    tickCount += 1;
    try {
      waDebugLog("poll.tick", { personId, tickCount, since: nextSince });
      const data = await fetchMessages({ personId, since: nextSince });
      if (stopped) return;

      options?.onPollSuccess?.(data);

      if (data.messages?.length) {
        waDebugLog("poll.new_messages", {
          personId,
          tickCount,
          count: data.messages.length,
          nextSince: data.nextSince,
        });
        onNewMessages(data.messages);
        nextSince = data.nextSince;
      } else if (!nextSince && data.nextSince) {
        waDebugLog("poll.set_initial_cursor", { personId, nextSince: data.nextSince });
        nextSince = data.nextSince;
      } else {
        waDebugLog("poll.no_new_messages", { personId, tickCount, nextSince });
      }
    } catch (error) {
      if (stopped) return;
      options?.onError?.(error);
      waDebugLog("poll.error", { personId, tickCount, error });
      console.error("poll error", error);
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, 2000);

  return () => {
    stopped = true;
    clearInterval(timer);
    waDebugLog("poll.stop", { personId, tickCount });
  };
}

// GET /api/whatsapp/unread-count?person_id=<uuid>
export async function fetchUnreadCount(personId: string) {
  const base = getWhatsAppBaseUrl();
  const headers = getWhatsAppHeaders();

  const url = new URL(`${base}/api/whatsapp/unread-count`);
  url.searchParams.set("person_id", personId);

  waDebugLog("fetchUnreadCount.request", {
    personId,
    url: url.toString(),
    hasApiKey: Boolean(headers["x-api-key"]),
  });

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    waDebugLog("fetchUnreadCount.error", { personId, status: res.status });
    throw new Error(`unread count failed ${res.status}`);
  }

  const data = await res.json();
  const result = {
    unreadCount: Number(data?.unreadCount || 0),
  } as { unreadCount: number };
  waDebugLog("fetchUnreadCount.response", result);
  return result;
}

// POST /api/whatsapp/mark-read?person_id=<uuid>&up_to=<iso>
export async function markRead(personId: string, upToIso?: string | null) {
  const base = getWhatsAppBaseUrl();
  const headers = getWhatsAppHeaders();

  const url = new URL(`${base}/api/whatsapp/mark-read`);
  url.searchParams.set("person_id", personId);
  if (upToIso) url.searchParams.set("up_to", upToIso);

  waDebugLog("markRead.request", {
    personId,
    upToIso: upToIso ?? null,
    url: url.toString(),
    hasApiKey: Boolean(headers["x-api-key"]),
  });

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    waDebugLog("markRead.error", { personId, status: res.status });
    throw new Error(`mark read failed ${res.status}`);
  }

  const data = await res.json();
  waDebugLog("markRead.response", data);
  return data;
}




export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});
