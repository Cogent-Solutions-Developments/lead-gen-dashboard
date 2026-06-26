import axios from "axios";
import { attachAuthToken } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";
import type {
  CampaignImportSummary,
  CampaignEmailTemplateDeleteResponse,
  CampaignEmailTemplateDeleteFallbackDrafts,
  CampaignEmailTemplatePayload,
  CampaignEmailTemplateResponse,
  CampaignEmailTemplateSaveResponse,
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CampaignListParams,
  CampaignListResponse,
  CreateCampaignRequest,
  CreateCampaignResponse,
  DeleteBlockedDetail,
  DeleteCampaignResponse,
  DashboardKpiLeaderboard,
  DashboardPeriod,
  DashboardPersonalSummary,
  DashboardStats,
  DeleteCampaignResult,
  DeleteBlocker,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventLeadListParams,
  EventLeadListResponse,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  GlobalLeadSearchParams,
  GlobalLeadSearchResponse,
  LeadContentGenerationRequest,
  LeadContentGenerationResponse,
  LeadContentPlatform,
  LeadEmailGenerationRequest,
  LeadEmailGenerationResponse,
  LeadTemplateValidationResponse,
  LeadItem,
  MessageStatus,
  NizoAiChatRequest,
  NizoAiChatResponse,
  NizoAiLeadContext,
  NizoAiLeadSearchItem,
  NizoAiLeadSearchResult,
  NizoAiMention,
  NizoAiMentionSearchResponse,
  NizoAiSource,
  RecentCampaign,
  ReplyNotification,
  StopCampaignResponse,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  GenerateSelectedLeadContentRequest,
  GenerateSelectedLeadContentResponse,
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
  WorkflowStatusHistoryResponse,
  WorkflowStatusUpdateResponse,
} from "./api";

export type {
  CampaignImportSummary,
  CampaignEmailTemplateDeleteResponse,
  CampaignEmailTemplateDeleteFallbackDrafts,
  CampaignEmailTemplatePayload,
  CampaignEmailTemplateResponse,
  CampaignEmailTemplateSaveResponse,
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CampaignListParams,
  CampaignListResponse,
  CreateCampaignRequest,
  CreateCampaignResponse,
  DeleteBlockedDetail,
  DeleteCampaignResponse,
  DashboardKpiLeaderboard,
  DashboardPeriod,
  DashboardPersonalSummary,
  DashboardStats,
  DeleteCampaignResult,
  DeleteBlocker,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventLeadListParams,
  EventLeadListResponse,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  GlobalLeadSearchParams,
  GlobalLeadSearchResponse,
  LeadContentGenerationRequest,
  LeadContentGenerationResponse,
  LeadContentPlatform,
  LeadEmailGenerationRequest,
  LeadEmailGenerationResponse,
  LeadTemplateValidationResponse,
  LeadItem,
  MessageStatus,
  NizoAiChatRequest,
  NizoAiChatResponse,
  NizoAiMention,
  NizoAiMentionSearchResponse,
  NizoAiSource,
  NizoAiLeadContext,
  NizoAiLeadSearchItem,
  NizoAiLeadSearchResult,
  RecentCampaign,
  ReplyNotification,
  StopCampaignResponse,
  UploadCommonAttachmentResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  GenerateSelectedLeadContentRequest,
  GenerateSelectedLeadContentResponse,
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
  WorkflowStatusHistoryResponse,
  WorkflowStatusUpdateResponse,
};

const LEAD_CONTENT_GENERATION_TIMEOUT_MS = 180000;

const apiClientProduction = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 60000,
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_API_KEY || "",
    ...getLocalDevNgrokHeaders(),
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

export async function getDashboardPersonalSummary(params?: { date?: string; period?: DashboardPeriod }) {
  const { data } = await apiClientProduction.get<DashboardPersonalSummary>(
    "/api/productions/dashboard/personal-summary",
    { params: { date: params?.date, period: params?.period } }
  );
  return {
    ...data,
    statuses: Array.isArray(data.statuses) ? data.statuses : [],
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function getDashboardKpiLeaderboard(params?: { date?: string; period?: DashboardPeriod }) {
  const { data } = await apiClientProduction.get<DashboardKpiLeaderboard>(
    "/api/productions/dashboard/kpi-leaderboard",
    { params: { date: params?.date, period: params?.period } }
  );
  return {
    ...data,
    runners: Array.isArray(data.runners) ? data.runners : [],
  };
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

export async function listCampaigns(params: CampaignListParams) {
  const { data } = await apiClientProduction.get<CampaignListResponse>(
    "/api/productions/campaigns",
    { params }
  );
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
  formData.append("eventRegistryId", payload.eventRegistryId?.trim() ?? "");
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

export async function validateLeadTemplateUpload(file: File | Blob) {
  const formData = new FormData();
  const fileName =
    typeof File !== "undefined" && file instanceof File && file.name
      ? file.name
      : "lead-upload-template.xlsx";

  formData.append("leadSheet", file, fileName);

  const { data } = await apiClientProduction.post<LeadTemplateValidationResponse>(
    "/api/productions/campaigns/lead-template/validate",
    formData
  );
  return data;
}

export async function downloadLeadTemplateFile(fileName = "lead-upload-template.xlsx") {
  const { data } = await apiClientProduction.get<Blob>("/api/productions/campaigns/lead-template", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "lead-upload-template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 500);
}

export async function getMyRecentCampaigns(limit?: number) {
  const params = typeof limit === "number" ? { limit } : undefined;
  const { data } = await apiClientProduction.get<{ campaigns: RecentCampaign[] }>(
    "/api/productions/my-leads/campaigns/recent",
    { params }
  );
  return data;
}

export async function listMyCampaigns(params: { status?: string; limit?: number; offset?: number }) {
  const { data } = await apiClientProduction.get<{
    campaigns: CampaignListItem[];
    total: number;
    hasMore: boolean;
  }>("/api/productions/my-leads/campaigns", { params });
  return data;
}

export async function createMyCampaignFromUpload(payload: UploadCampaignRequest) {
  const formData = new FormData();
  formData.append("name", payload.name.trim());
  formData.append("location", payload.location?.trim() ?? "");
  formData.append("category", payload.category?.trim() ?? "");
  formData.append("date", payload.date?.trim() ?? "");
  formData.append("eventRegistryId", payload.eventRegistryId?.trim() ?? "");
  formData.append("icp", payload.icp?.trim() ?? "");

  const leadSheetName =
    typeof File !== "undefined" && payload.leadSheet instanceof File && payload.leadSheet.name
      ? payload.leadSheet.name
      : "lead-sheet.csv";

  formData.append("leadSheet", payload.leadSheet, leadSheetName);

  const { data } = await apiClientProduction.post<UploadCampaignResponse>(
    "/api/productions/my-leads/campaigns",
    formData
  );
  return data;
}

export async function validateMyLeadTemplateUpload(file: File | Blob) {
  const formData = new FormData();
  const fileName =
    typeof File !== "undefined" && file instanceof File && file.name
      ? file.name
      : "lead-upload-template.xlsx";

  formData.append("leadSheet", file, fileName);

  const { data } = await apiClientProduction.post<LeadTemplateValidationResponse>(
    "/api/productions/my-leads/lead-template/validate",
    formData
  );
  return data;
}

export async function downloadMyLeadTemplateFile(fileName = "lead-upload-template.xlsx") {
  const { data } = await apiClientProduction.get<Blob>("/api/productions/my-leads/lead-template", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "lead-upload-template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 500);
}

export async function getMyCampaign(id: string) {
  const { data } = await apiClientProduction.get<CampaignDetail>(
    `/api/productions/my-leads/campaigns/${id}`
  );
  return data;
}

export function exportMyCampaignCsvUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/productions/my-leads/campaigns/${id}/export`;
}

export async function getMyCampaignLeads(id: string, status: string = "all") {
  const { data } = await apiClientProduction.get<{ leads: LeadItem[]; total: number }>(
    `/api/productions/my-leads/campaigns/${id}/leads`,
    { params: { status } }
  );
  return data;
}

export async function listMyAllLeads() {
  const { data } = await apiClientProduction.get<{ leads: LeadItem[]; total: number }>(
    "/api/productions/my-leads/all/leads"
  );
  return data;
}

export async function searchMyLeads(params?: GlobalLeadSearchParams) {
  const { data } = await apiClientProduction.get<GlobalLeadSearchResponse>("/api/productions/my-leads/leads/search", {
    params: {
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
      approvalStatus: params?.approvalStatus,
      workflowStatus: params?.workflowStatus,
      canonicalEventKey: params?.canonicalEventKey,
      campaignId: params?.campaignId,
      hasEmail: params?.hasEmail,
      hasPhone: params?.hasPhone,
      hasLinkedin: params?.hasLinkedin,
      hasWebsite: params?.hasWebsite,
      sortBy: params?.sortBy,
      sortDir: params?.sortDir,
    },
  });
  return data;
}

export async function listMyEvents() {
  const { data } = await apiClientProduction.get<EventSummaryResponse>("/api/productions/my-leads/events");
  return data;
}

export async function listMyEventLeads(canonicalEventKey: string, params?: EventLeadListParams) {
  const { data } = await apiClientProduction.get<EventLeadListResponse>(
    `/api/productions/my-leads/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        search: params?.search,
        workflowStatus: params?.workflowStatus,
        category: params?.category,
        includeManual: params?.includeManual,
        sort: params?.sort,
      },
    }
  );
  return data;
}

export async function addMyEventLead(canonicalEventKey: string, payload: EventLeadCreateRequest) {
  const { data } = await apiClientProduction.post<EventLeadCreateResponse>(
    `/api/productions/my-leads/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    payload
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

export async function getCampaignEmailTemplate(id: string) {
  const { data } = await apiClientProduction.get<CampaignEmailTemplateResponse>(
    `/api/productions/campaigns/${id}/email-template`
  );
  return data;
}

export async function saveCampaignEmailTemplate(id: string, payload: CampaignEmailTemplatePayload) {
  const { data } = await apiClientProduction.post<CampaignEmailTemplateSaveResponse>(
    `/api/productions/campaigns/${id}/email-template`,
    payload
  );
  return data;
}

export async function deleteCampaignEmailTemplate(id: string) {
  const { data } = await apiClientProduction.delete<CampaignEmailTemplateDeleteResponse>(
    `/api/productions/campaigns/${id}/email-template`
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

export async function searchLeads(params?: GlobalLeadSearchParams) {
  const { data } = await apiClientProduction.get<GlobalLeadSearchResponse>("/api/productions/leads/search", {
    params: {
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
      approvalStatus: params?.approvalStatus,
      workflowStatus: params?.workflowStatus,
      canonicalEventKey: params?.canonicalEventKey,
      campaignId: params?.campaignId,
      hasEmail: params?.hasEmail,
      hasPhone: params?.hasPhone,
      hasLinkedin: params?.hasLinkedin,
      hasWebsite: params?.hasWebsite,
      sortBy: params?.sortBy,
      sortDir: params?.sortDir,
    },
  });
  return data;
}

export async function listEvents() {
  const { data } = await apiClientProduction.get<EventSummaryResponse>("/api/productions/events");
  return data;
}

export async function listEventLeads(canonicalEventKey: string, params?: EventLeadListParams) {
  const { data } = await apiClientProduction.get<EventLeadListResponse>(
    `/api/productions/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        search: params?.search,
        workflowStatus: params?.workflowStatus,
        category: params?.category,
        includeManual: params?.includeManual,
        sort: params?.sort,
      },
    }
  );
  return data;
}

export async function nizoAiChat(payload: NizoAiChatRequest) {
  const { data } = await apiClientProduction.post<NizoAiChatResponse>("/api/productions/nizo-ai/chat", {
    message: payload.message,
    sessionId: payload.sessionId || undefined,
    mentions: payload.mentions || [],
  });
  return data;
}

export async function searchNizoAiMentions(params?: {
  q?: string;
  kind?: "all" | "lead" | "event";
  limit?: number;
}) {
  const { data } = await apiClientProduction.get<NizoAiMentionSearchResponse>("/api/productions/nizo-ai/mentions", {
    params: {
      q: params?.q,
      kind: params?.kind,
      limit: params?.limit,
    },
  });
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

export async function generateLeadEmailContent(id: string, payload?: LeadEmailGenerationRequest) {
  const { data } = await apiClientProduction.post<LeadEmailGenerationResponse>(
    `/api/productions/leads/${id}/email-content/generate`,
    payload ?? {},
    { timeout: LEAD_CONTENT_GENERATION_TIMEOUT_MS }
  );
  return data;
}

export async function generateLeadContent(id: string, payload: LeadContentGenerationRequest) {
  const { data } = await apiClientProduction.post<LeadContentGenerationResponse>(
    `/api/productions/leads/${id}/content/generate`,
    payload,
    { timeout: LEAD_CONTENT_GENERATION_TIMEOUT_MS }
  );
  return data;
}

export async function updateLeadWorkflowStatus(id: string, workflowStatus: WorkflowStatus, comment?: string) {
  const { data } = await apiClientProduction.put<WorkflowStatusUpdateResponse>(
    `/api/productions/leads/${id}/workflow-status`,
    { workflowStatus, comment }
  );
  return data;
}

export async function getLeadWorkflowStatusHistory(id: string) {
  const { data } = await apiClientProduction.get<WorkflowStatusHistoryResponse>(
    `/api/productions/leads/${id}/workflow-status-history`
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

export async function generateSelectedCampaignLeadContent(payload: GenerateSelectedLeadContentRequest) {
  const { campaignId, leadIds, feedback } = payload;
  const { data } = await apiClientProduction.post<GenerateSelectedLeadContentResponse>(
    `/api/productions/campaigns/${campaignId}/content/generate-selected`,
    { leadIds, feedback },
    { timeout: LEAD_CONTENT_GENERATION_TIMEOUT_MS }
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
    ...getLocalDevNgrokHeaders(),
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
