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

const apiClientProduction = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
  withCredentials: true,
});

type ApiError = Error & {
  status?: number;
  data?: unknown;
};

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ApiError).status === 404;
}

async function with404Fallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    return fallback();
  }
}

// Clean error messages
apiClientProduction.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data
        ? typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err.message || "Request failed";
    const wrapped = new Error(msg) as ApiError;
    wrapped.status = err?.response?.status;
    wrapped.data = err?.response?.data;
    return Promise.reject(wrapped);
  }
);

export async function getDashboardStats() {
  const { data } = await apiClientProduction.get<DashboardStats>(
    "/api/productions/dashboard/stats"
  );
  return data;
}

export async function getDashboardDistribution() {
  const { data } = await apiClientProduction.get(
    "/api/productions/dashboard/distribution"
  );
  return data as { total: number; contacted: number; pending: number; other: number };
}

export async function getRecentCampaigns(limit?: number) {
  const params = typeof limit === "number" ? { limit } : undefined;
  const { data } = await apiClientProduction.get<{ campaigns: RecentCampaign[] }>(
    "/api/productions/campaigns/recent",
    { params }
  );
  return data;
}

export async function listCampaigns(params: { status?: string; limit?: number; offset?: number }) {
  const { data } = await apiClientProduction.get<{
    campaigns: CampaignListItem[];
    total: number;
    hasMore: boolean;
  }>("/api/productions/campaigns", { params });
  return data;
}

export async function createCampaign(payload: string | CreateCampaignRequest) {
  const requestBody = typeof payload === "string" ? { icp: payload } : payload;

  const { data } = await apiClientProduction.post<{
    id: string;
    name: string;
    icpPreview: string;
    status: string;
    progress: number;
    createdAt: string;
  }>("/api/productions/campaigns", requestBody);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await apiClientProduction.get<CampaignDetail>(
    `/api/productions/campaigns/${id}`
  );
  return data;
}

export async function getCampaignInfo(id: string) {
  const { data } = await apiClientProduction.get<CampaignInfoResponse>(
    `/api/productions/campaigns/${id}/info`
  );
  return data;
}

export async function getCampaignLeads(id: string, status: string = "all") {
  const { data } = await apiClientProduction.get<{ leads: LeadItem[]; total: number }>(
    `/api/productions/campaigns/${id}/leads`,
    { params: { status } }
  );
  return data;
}

export async function approveLead(id: string) {
  const { data } = await apiClientProduction.put(`/api/productions/leads/${id}/approve`);
  return data;
}

export async function rejectLead(id: string) {
  const { data } = await apiClientProduction.put(`/api/productions/leads/${id}/reject`);
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
  const { data } = await apiClientProduction.put(`/api/productions/leads/${id}/content`, payload);
  return data;
}

export async function approveAllCampaign(id: string) {
  const { data } = await apiClientProduction.put(
    `/api/productions/campaigns/${id}/approve-all`
  );
  return data;
}

export async function startOutreach(id: string) {
  const { data } = await apiClientProduction.post(
    `/api/productions/campaigns/${id}/start-outreach`
  );
  return data;
}

export function exportCampaignCsvUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/productions/campaigns/${id}/export`;
}

export async function stopCampaign(id: string) {
  const { data } = await apiClientProduction.post(
    `/api/productions/campaigns/${id}/stop`
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

  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.post<SendAllCampaignResponse>(
        `/api/productions/campaigns/${campaignId}/send-all?${query.toString()}`,
        formData
      );
      return data;
    },
    async () => {
      const { data } = await apiClientProduction.post<SendAllCampaignResponse>(
        `/api/campaigns/${campaignId}/send-all?${query.toString()}`,
        formData
      );
      return data;
    }
  );
}

export async function uploadCampaignCommonAttachment(campaignId: string, file: File | Blob) {
  const formData = new FormData();
  formData.append("file", file);

  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.post<UploadCommonAttachmentResponse>(
        `/api/productions/campaigns/${campaignId}/upload-common-attachment`,
        formData
      );
      return data;
    },
    async () => {
      const { data } = await apiClientProduction.post<UploadCommonAttachmentResponse>(
        `/api/campaigns/${campaignId}/upload-common-attachment`,
        formData
      );
      return data;
    }
  );
}

export async function approveSelectedCampaignLeads(payload: ApproveSelectedLeadsRequest) {
  const { campaignId, leadIds } = payload;
  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.post<ApproveSelectedLeadsResponse>(
        `/api/productions/campaigns/${campaignId}/approve-selected-leads`,
        leadIds
      );
      return data;
    },
    async () => {
      const { data } = await apiClientProduction.post<ApproveSelectedLeadsResponse>(
        `/api/campaigns/${campaignId}/approve-selected-leads`,
        leadIds
      );
      return data;
    }
  );
}

export async function sendSelectedCampaignLeads(payload: SendSelectedLeadsRequest) {
  const { campaignId, leadIds, attachmentId } = payload;
  const query = new URLSearchParams();
  query.set("attachment_id", attachmentId);

  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.post<SendSelectedLeadsResponse>(
        `/api/productions/campaigns/${campaignId}/send-selected-leads?${query.toString()}`,
        leadIds
      );
      return data;
    },
    async () => {
      const { data } = await apiClientProduction.post<SendSelectedLeadsResponse>(
        `/api/campaigns/${campaignId}/send-selected-leads?${query.toString()}`,
        leadIds
      );
      return data;
    }
  );
}

export async function listReplyNotifications(params?: {
  campaignId?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.get<{
        replies: ReplyNotification[];
        total: number;
        unread: number;
      }>("/api/productions/messages/replies", {
        params,
      });
      return data;
    },
    async () => {
      try {
        const { data } = await apiClientProduction.get<{
          replies: ReplyNotification[];
          total: number;
          unread: number;
        }>("/api/messages/replies", {
          params,
        });
        return data;
      } catch (error) {
        if (!isNotFoundError(error)) throw error;

        const { data } = await apiClientProduction.get<{
          notifications?: Array<{
            id?: string;
            providerMessageId?: string | null;
            fromPhone?: string | null;
            contactName?: string | null;
            text?: string | null;
            receivedAt?: string;
          }>;
        }>("/api/whatsapp/notifications", {
          params: {
            limit: params?.limit,
            unread_only: params?.unreadOnly ? true : undefined,
          },
        });

        const replies: ReplyNotification[] = (data.notifications || []).map((n) => ({
          id: String(n.id || ""),
          campaignId: null,
          messageId: n.providerMessageId || null,
          channel: "whatsapp",
          text: String(n.text || ""),
          receivedAt: n.receivedAt || new Date().toISOString(),
          isRead: false,
          recipient: {
            leadId: null,
            leadName: n.contactName || null,
            title: null,
            company: null,
            email: null,
            phone: n.fromPhone || null,
            linkedinUrl: null,
          },
        }));

        return {
          replies,
          total: replies.length,
          unread: replies.length,
        };
      }
    }
  );
}

export async function listMessageStatuses(params?: {
  campaignId?: string;
  leadId?: string;
  limit?: number;
}) {
  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.get<{
        statuses: MessageStatus[];
      }>("/api/productions/messages/status", {
        params,
      });
      return data;
    },
    async () => {
      try {
        const { data } = await apiClientProduction.get<{
          statuses: MessageStatus[];
        }>("/api/messages/status", {
          params,
        });
        return data;
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        return { statuses: [] };
      }
    }
  );
}

export async function markReplyAsRead(id: string) {
  return with404Fallback(
    async () => {
      const { data } = await apiClientProduction.put<{
        id: string;
        isRead: boolean;
      }>(`/api/productions/messages/replies/${id}/read`);
      return data;
    },
    async () => {
      try {
        const { data } = await apiClientProduction.put<{
          id: string;
          isRead: boolean;
        }>(`/api/messages/replies/${id}/read`);
        return data;
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        return { id, isRead: true };
      }
    }
  );
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
  const isSharedCommonAttachmentRoute =
    /^\/api\/campaigns\/[^/]+\/common-attachments(?:\?.*)?$/i.test(url) ||
    /^\/api\/campaigns\/[^/]+\/common-attachment\/[^/]+(?:\?.*)?$/i.test(url);

  if (
    url.startsWith("/api/") &&
    !url.startsWith("/api/productions/") &&
    !isSharedCommonAttachmentRoute
  ) {
    config.url = url.replace(/^\/api\//, "/api/productions/");
  }
  return config;
});
