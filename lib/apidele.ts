import axios from "axios";
import type {
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CreateCampaignRequest,
  DashboardStats,
  LeadItem,
  MessageStatus,
  RecentCampaign,
  ReplyNotification,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  SendSelectedLeadsRequest,
  SendSelectedLeadsResponse,
  SendAllCampaignRequest,
  SendAllCampaignResponse,
} from "./api";

export type {
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CreateCampaignRequest,
  DashboardStats,
  LeadItem,
  MessageStatus,
  RecentCampaign,
  ReplyNotification,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  SendSelectedLeadsRequest,
  SendSelectedLeadsResponse,
  SendAllCampaignRequest,
  SendAllCampaignResponse,
};

const apiClientDelegate = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
  withCredentials: true,
});

// Clean error messages
apiClientDelegate.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data
        ? typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || "Request failed";
    return Promise.reject(new Error(msg));
  }
);

export async function getDashboardStats() {
  const { data } = await apiClientDelegate.get<DashboardStats>(
    "/api/delegates/dashboard/stats"
  );
  return data;
}

export async function getDashboardDistribution() {
  const { data } = await apiClientDelegate.get(
    "/api/delegates/dashboard/distribution"
  );
  return data as { total: number; contacted: number; pending: number; other: number };
}

export async function getRecentCampaigns(limit?: number) {
  const params = typeof limit === "number" ? { limit } : undefined;
  const { data } = await apiClientDelegate.get<{ campaigns: RecentCampaign[] }>(
    "/api/delegates/campaigns/recent",
    { params }
  );
  return data;
}

export async function listCampaigns(params: { status?: string; limit?: number; offset?: number }) {
  const { data } = await apiClientDelegate.get<{
    campaigns: CampaignListItem[];
    total: number;
    hasMore: boolean;
  }>("/api/delegates/campaigns", { params });
  return data;
}

export async function createCampaign(payload: string | CreateCampaignRequest) {
  const requestBody = typeof payload === "string" ? { icp: payload } : payload;

  const { data } = await apiClientDelegate.post<{
    id: string;
    name: string;
    icpPreview: string;
    status: string;
    progress: number;
    createdAt: string;
  }>("/api/delegates/campaigns", requestBody);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await apiClientDelegate.get<CampaignDetail>(
    `/api/delegates/campaigns/${id}`
  );
  return data;
}

export async function getCampaignInfo(id: string) {
  const { data } = await apiClientDelegate.get<CampaignInfoResponse>(
    `/api/delegates/campaigns/${id}/info`
  );
  return data;
}

export async function getCampaignLeads(id: string, status: string = "all") {
  const { data } = await apiClientDelegate.get<{ leads: LeadItem[]; total: number }>(
    `/api/delegates/campaigns/${id}/leads`,
    { params: { status } }
  );
  return data;
}

export async function approveLead(id: string) {
  const { data } = await apiClientDelegate.put(`/api/delegates/leads/${id}/approve`);
  return data;
}

export async function rejectLead(id: string) {
  const { data } = await apiClientDelegate.put(`/api/delegates/leads/${id}/reject`);
  return data;
}

export async function updateLeadContent(
  id: string,
  payload: {
    contentEmailSubject: string;
    contentEmail: string;
    contentLinkedin: string;
    contentWhatsapp: string;
  }
) {
  const { data } = await apiClientDelegate.put(`/api/delegates/leads/${id}/content`, payload);
  return data;
}

export async function approveAllCampaign(id: string) {
  const { data } = await apiClientDelegate.put(
    `/api/delegates/campaigns/${id}/approve-all`
  );
  return data;
}

export async function startOutreach(id: string) {
  const { data } = await apiClientDelegate.post(
    `/api/delegates/campaigns/${id}/start-outreach`
  );
  return data;
}

export function exportCampaignCsvUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/delegates/campaigns/${id}/export`;
}

export async function stopCampaign(id: string) {
  const { data } = await apiClientDelegate.post(
    `/api/delegates/campaigns/${id}/stop`
  );
  return data as { campaignId: string; status: string; message: string };
}

export async function sendAllCampaignLeads(payload: SendAllCampaignRequest) {
  const { campaignId, leadIds, channels = "both", file } = payload;
  const query = new URLSearchParams();
  query.set("channels", channels);
  for (const leadId of leadIds) query.append("leads", leadId);

  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClientDelegate.post<SendAllCampaignResponse>(
    `/api/delegates/campaigns/${campaignId}/send-all?${query.toString()}`,
    formData
  );
  return data;
}

export async function uploadCampaignCommonAttachment(campaignId: string, file: File | Blob) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClientDelegate.post<UploadCommonAttachmentResponse>(
    `/api/delegates/campaigns/${campaignId}/upload-common-attachment`,
    formData
  );
  return data;
}

export async function approveSelectedCampaignLeads(payload: ApproveSelectedLeadsRequest) {
  const { campaignId, leadIds } = payload;
  const { data } = await apiClientDelegate.post<ApproveSelectedLeadsResponse>(
    `/api/delegates/campaigns/${campaignId}/approve-selected-leads`,
    leadIds
  );
  return data;
}

export async function sendSelectedCampaignLeads(payload: SendSelectedLeadsRequest) {
  const { campaignId, leadIds, attachmentId } = payload;
  const query = new URLSearchParams();
  query.set("attachment_id", attachmentId);

  const { data } = await apiClientDelegate.post<SendSelectedLeadsResponse>(
    `/api/delegates/campaigns/${campaignId}/send-selected-leads?${query.toString()}`,
    leadIds
  );
  return data;
}

export async function listReplyNotifications(params?: {
  campaignId?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const { data } = await apiClientDelegate.get<{
    replies: ReplyNotification[];
    total: number;
    unread: number;
  }>("/api/delegates/messages/replies", {
    params,
  });
  return data;
}

export async function listMessageStatuses(params?: {
  campaignId?: string;
  leadId?: string;
  limit?: number;
}) {
  const { data } = await apiClientDelegate.get<{
    statuses: MessageStatus[];
  }>("/api/delegates/messages/status", {
    params,
  });
  return data;
}

export async function markReplyAsRead(id: string) {
  const { data } = await apiClientDelegate.put<{
    id: string;
    isRead: boolean;
  }>(`/api/delegates/messages/replies/${id}/read`);
  return data;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});

api.interceptors.request.use((config) => {
  const url = config.url || "";
  if (url.startsWith("/api/") && !url.startsWith("/api/delegates/")) {
    config.url = url.replace(/^\/api\//, "/api/delegates/");
  }
  return config;
});
