import axios from "axios";
import { attachAuthToken } from "@/lib/auth";
import type {
  CampaignImportSummary,
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CreateCampaignRequest,
  CreateCampaignResponse,
  DeleteBlockedDetail,
  DeleteCampaignResponse,
  DashboardStats,
  DeleteCampaignResult,
  DeleteBlocker,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  LeadItem,
  MessageStatus,
  RecentCampaign,
  ReplyNotification,
  StopCampaignResponse,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  SendSelectedLeadsRequest,
  SendSelectedLeadsResponse,
  CreateWhatsAppOptOutRequest,
  CreateWhatsAppOptOutResponse,
  SendAllCampaignRequest,
  SendAllCampaignResponse,
  UploadCampaignRequest,
  UploadCampaignResponse,
  ListWhatsAppOptOutsResponse,
  UploadWhatsAppOptOutCsvResponse,
  DisableLeadWhatsAppResponse,
  WorkflowStatus,
  WorkflowStatusDefinitionItem,
  WorkflowStatusDefinitionsResponse,
  WorkflowStatusUpdateResponse,
} from "./api";

export type {
  CampaignImportSummary,
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CreateCampaignRequest,
  CreateCampaignResponse,
  DeleteBlockedDetail,
  DeleteCampaignResponse,
  DashboardStats,
  DeleteCampaignResult,
  DeleteBlocker,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  LeadItem,
  MessageStatus,
  RecentCampaign,
  ReplyNotification,
  StopCampaignResponse,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  SendSelectedLeadsRequest,
  SendSelectedLeadsResponse,
  CreateWhatsAppOptOutRequest,
  CreateWhatsAppOptOutResponse,
  SendAllCampaignRequest,
  SendAllCampaignResponse,
  UploadCampaignRequest,
  UploadCampaignResponse,
  ListWhatsAppOptOutsResponse,
  UploadWhatsAppOptOutCsvResponse,
  DisableLeadWhatsAppResponse,
  WorkflowStatus,
  WorkflowStatusDefinitionItem,
  WorkflowStatusDefinitionsResponse,
  WorkflowStatusUpdateResponse,
};

const apiClientProduction = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
  withCredentials: true,
});

apiClientProduction.interceptors.request.use(attachAuthToken);

type ApiError = Error & {
  status?: number;
  data?: unknown;
};

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

  const { data } = await apiClientProduction.post<CreateCampaignResponse>(
    "/api/productions/campaigns",
    requestBody
  );
  return data;
}

export async function createCampaignFromUpload(payload: UploadCampaignRequest) {
  const formData = new FormData();
  formData.append("name", payload.name.trim());
  formData.append("location", payload.location?.trim() ?? "");
  formData.append("category", payload.category?.trim() ?? "");
  formData.append("date", payload.date?.trim() ?? "");
  formData.append("icp", payload.icp?.trim() ?? "");

  const leadSheetName =
    typeof File !== "undefined" && payload.leadSheet instanceof File && payload.leadSheet.name
      ? payload.leadSheet.name
      : "lead-sheet.csv";

  formData.append("leadSheet", payload.leadSheet, leadSheetName);

  const { data } = await apiClientProduction.post<UploadCampaignResponse>(
    "/api/productions/campaigns",
    formData
  );
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

export async function listAllLeads() {
  const { data } = await apiClientProduction.get<{ leads: LeadItem[]; total: number }>(
    "/api/productions/all/leads"
  );
  return data;
}

export async function listEvents() {
  const { data } = await apiClientProduction.get<EventSummaryResponse>("/api/productions/events");
  return data;
}

export async function listWorkflowStatuses() {
  const { data } = await apiClientProduction.get<WorkflowStatusDefinitionsResponse>(
    "/api/productions/workflow-statuses"
  );
  return data;
}

export async function createWorkflowStatus(label: string) {
  const { data } = await apiClientProduction.post<WorkflowStatusDefinitionItem>(
    "/api/productions/workflow-statuses",
    { label }
  );
  return data;
}

export async function addEventLead(canonicalEventKey: string, payload: EventLeadCreateRequest) {
  const { data } = await apiClientProduction.post<EventLeadCreateResponse>(
    `/api/productions/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    payload
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

export async function updateLeadWorkflowStatus(id: string, workflowStatus: WorkflowStatus) {
  const { data } = await apiClientProduction.put<WorkflowStatusUpdateResponse>(
    `/api/productions/leads/${id}/workflow-status`,
    { workflowStatus }
  );
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
  return data as StopCampaignResponse;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getDetailMessage(data: unknown, fallback: string) {
  const detail = asRecord(data)?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function getApiErrorMessage(detail: unknown, fallback: string) {
  if (typeof detail === "string") return detail;
  const message = asRecord(detail)?.message;
  return typeof message === "string" ? message : fallback;
}

function createApiActionError(status: number, detail: unknown, fallback: string) {
  const error = new Error(getApiErrorMessage(detail, fallback)) as Error & {
    status?: number;
    detail?: unknown;
  };
  error.status = status;
  error.detail = detail;
  return error;
}

export async function deleteCampaign(id: string) {
  const response = await apiClientProduction.delete(`/api/productions/campaigns/${id}`, {
    validateStatus: () => true,
  });

  const data = response.data;
  const detail = asRecord(asRecord(data)?.detail);

  if (response.status === 409 && detail?.code === "campaign_delete_blocked") {
    return {
      ok: false,
      blocked: true,
      detail: detail as DeleteBlockedDetail,
    } satisfies DeleteCampaignResult;
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(getDetailMessage(data, "Failed to delete campaign"));
  }

  return {
    ok: true,
    blocked: false,
    data: data as DeleteCampaignResponse,
  } satisfies DeleteCampaignResult;
}

export async function forceDeleteCampaign(id: string) {
  const response = await apiClientProduction.post(
    `/api/productions/campaigns/${id}/force-delete`,
    { confirm: true, mode: "force" },
    { validateStatus: () => true }
  );

  const data = response.data;

  if (response.status < 200 || response.status >= 300) {
    throw createApiActionError(
      response.status,
      asRecord(data)?.detail ?? data,
      "Force delete failed"
    );
  }

  return data as ForceDeleteCampaignResponse;
}

export async function sendAllCampaignLeads(payload: SendAllCampaignRequest) {
  const { campaignId, channels = "both", file } = payload;
  const query = new URLSearchParams();
  query.set("channels", channels);

  const formData = new FormData();
  if (file) {
    const filename =
      typeof File !== "undefined" && file instanceof File && file.name
        ? file.name
        : "attachment";
    formData.append("file", file, filename);
  }

  const { data } = await apiClientProduction.post<SendAllCampaignResponse>(
    `/api/productions/campaigns/${campaignId}/send-all?${query.toString()}`,
    formData
  );
  return data;
}

export async function uploadCampaignCommonAttachment(campaignId: string, file: File | Blob) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClientProduction.post<UploadCommonAttachmentResponse>(
    `/api/productions/campaigns/${campaignId}/upload-common-attachment`,
    formData
  );
  return data;
}

export async function approveSelectedCampaignLeads(payload: ApproveSelectedLeadsRequest) {
  const { campaignId, leadIds } = payload;
  const { data } = await apiClientProduction.post<ApproveSelectedLeadsResponse>(
    `/api/productions/campaigns/${campaignId}/approve-selected-leads`,
    leadIds
  );
  return data;
}

export async function sendSelectedCampaignLeads(payload: SendSelectedLeadsRequest) {
  const { campaignId, leadIds, attachmentId } = payload;
  const query = new URLSearchParams();
  if (attachmentId) query.set("attachment_id", attachmentId);
  const queryText = query.toString();

  const { data } = await apiClientProduction.post<SendSelectedLeadsResponse>(
    `/api/productions/campaigns/${campaignId}/send-selected-leads${queryText ? `?${queryText}` : ""}`,
    leadIds
  );
  return data;
}

export async function listWhatsAppOptOuts(params?: {
  limit?: number;
  activeOnly?: boolean;
}) {
  const { data } = await apiClientProduction.get<ListWhatsAppOptOutsResponse>(
    "/api/marketing/opt-outs",
    {
      params: {
        limit: params?.limit,
        active_only:
          typeof params?.activeOnly === "boolean"
            ? params.activeOnly
            : undefined,
      },
    }
  );
  return data;
}

export async function uploadWhatsAppOptOutCsv(file: File | Blob) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClientProduction.post<UploadWhatsAppOptOutCsvResponse>(
    "/api/marketing/opt-outs/upload",
    formData
  );
  return data;
}

export async function createWhatsAppOptOut(payload: CreateWhatsAppOptOutRequest) {
  const body = {
    phone: payload.phone?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    leadId: payload.leadId?.trim() || undefined,
    reason: payload.reason?.trim() || undefined,
    source: payload.source?.trim() || undefined,
  };
  const { data } = await apiClientProduction.post<CreateWhatsAppOptOutResponse>(
    "/api/marketing/opt-outs",
    body
  );
  return data;
}

export async function disableLeadWhatsApp(leadId: string, reason?: string) {
  const { data } = await apiClientProduction.post<DisableLeadWhatsAppResponse>(
    `/api/leads/${leadId}/marketing/disable`,
    null,
    {
      params: reason?.trim() ? { reason: reason.trim() } : undefined,
    }
  );
  return data;
}

export async function listReplyNotifications(params?: {
  campaignId?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
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

export async function listMessageStatuses(params?: {
  campaignId?: string;
  leadId?: string;
  limit?: number;
}) {
  void params;
  return { statuses: [] as MessageStatus[] };
}

export async function markReplyAsRead(id: string) {
  return { id, isRead: true };
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
  },
});

api.interceptors.request.use((config) => {
  attachAuthToken(config);
  const url = config.url || "";
  if (url.startsWith("/api/") && !url.startsWith("/api/productions/")) {
    config.url = url.replace(/^\/api\//, "/api/productions/");
  }
  return config;
});
