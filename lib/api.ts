import axios, { type AxiosInstance } from "axios";
import { apiClient } from "./apiClient";
import { attachAuthToken, getAuthHeader } from "@/lib/auth";

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
  eventRegistryId?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  leadsCount: number;
  status: string;
  campaignType?: CampaignType;
  manualUpload?: boolean;
  campaignSource?: string | null;
};

export type CampaignType = "manual_upload" | "generated";

export type CampaignListItem = {
  id: string;
  name: string;
  icpPreview: string;
  eventRegistryId?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  status: string;
  campaignType?: CampaignType;
  manualUpload?: boolean;
  campaignSource?: string | null;
  category?: string | null;
  location?: string | null;
  date?: string | null;
  progress: number;
  totalLeads: number;
  toApprove: number;
  createdAt: string;
};

export type CampaignDetail = {
  id: string;
  name: string;
  icpPreview: string;
  eventRegistryId?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  status: string;
  campaignType?: CampaignType;
  manualUpload?: boolean;
  campaignSource?: string | null;
  category?: string | null;
  location?: string | null;
  date?: string | null;
  createdAt: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suppressed: number;
    sendableApproved: number;
  };
};

export type CreateCampaignRequest = {
  icp: string;
  name?: string;
  location?: string;
  date?: string;
  category?: string;
  eventRegistryId?: string;
};

export type CreateCampaignResponse = {
  id: string;
  name: string;
  icpPreview: string;
  eventRegistryId?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  status: string;
  campaignType?: CampaignType;
  manualUpload?: boolean;
  campaignSource?: string | null;
  progress: number;
  createdAt: string;
};

export type CampaignImportSummary = {
  fileName: string;
  importedLeads: number;
  companies: number;
  invalidRows: number;
  duplicatesCollapsed: number;
  rejectedRows: number;
};

export type UploadCampaignRequest = {
  name: string;
  location?: string;
  category?: string;
  date?: string;
  icp?: string;
  eventRegistryId?: string;
  leadSheet: File | Blob;
};

export type UploadCampaignResponse = CreateCampaignResponse & {
  importSummary: CampaignImportSummary;
};

export type SendAllCampaignChannels = "email" | "whatsapp" | "both";
export type OutreachRequestChannel = "email" | "whatsapp";
export type RequestedOutreachChannels = OutreachRequestChannel[];

export type SendAllCampaignRequest = {
  campaignId: string;
  leadIds?: string[];
  channels?: SendAllCampaignChannels;
  file?: File | Blob;
};

export type SendAllCampaignResponse = {
  ok: boolean;
  campaignId: string;
  pendingFound: number;
  approved: number;
  suppressedOptOut: number;
  skippedNoChannel?: number;
  queuedEmail: number;
  queuedWhatsapp: number;
  attachmentsCreated?: number;
  attachmentOriginalName?: string | null;
  requestedChannels?: RequestedOutreachChannels;
  message: string;
};

export type StopCampaignResponse = {
  campaignId: string;
  status: "cancelled";
  message: string;
};

export type DeleteCampaignResponse = {
  campaignId: string;
  status: "deleted";
  message: string;
  deleteReady: true;
};

export type ForceDeleteCampaignResponse = {
  campaignId: string;
  status: "deleted";
  forced: true;
  message: string;
  preparation: {
    cancelledJobs: number;
    failedQueueItems: number;
    progressCleaned: boolean;
  };
};

export type DeleteBlocker = {
  code:
    | "campaign_not_terminal"
    | "progress_running"
    | "content_generation_active"
    | "profile_batch_active"
    | "jobs_active"
    | "send_queue_active";
  message: string;
  status?: string;
  count?: number;
};

export type DeleteBlockedDetail = {
  code: "campaign_delete_blocked";
  message: string;
  campaignId: string;
  status: string;
  deleteReady: false;
  blockers: DeleteBlocker[];
  checks: {
    progressStatus: string;
    doneTotal: number;
    targetTotal: number;
    contentInProgress: boolean;
    batchInProgress: boolean;
    stopRequested: boolean;
    activeJobCount: number;
    activeSendQueueCount: number;
  };
  nextAction: string;
};

export type DeleteCampaignResult =
  | {
      ok: true;
      blocked: false;
      data: DeleteCampaignResponse;
    }
  | {
      ok: false;
      blocked: true;
      detail: DeleteBlockedDetail;
    };

export type UploadCommonAttachmentResponse = {
  message: string;
  attachment_id: string;
};

export type ApproveSelectedLeadsRequest = {
  campaignId: string;
  leadIds: string[];
};

export type ApproveSelectedLeadsResponse = {
  message: string;
  approvedLeadIds?: string[];
  suppressedLeadIds?: string[];
  approvedCount?: number;
  suppressedCount?: number;
};

export type SendSelectedLeadsRequest = {
  campaignId: string;
  leadIds: string[];
  attachmentId?: string;
};

export type SendSelectedLeadsResponse = {
  message: string;
  queuedLeads?: number;
  queuedEmail?: number;
  queuedWhatsapp?: number;
  suppressedOptOut?: number;
  skippedNoChannel?: number;
  requestedChannels?: RequestedOutreachChannels;
};

export type LeadAttachment = {
  id: string;
  name: string;
  url?: string | null;
  mime?: string | null;
  sizeBytes?: number | null;
  channel?: string | null;
};

export type ChannelCapability = {
  sendable?: boolean;
  attachmentsSupported?: boolean;
  delivery?: string | null;
  usesDraftContent?: boolean;
  requiresApprovedDraft?: boolean;
  mode?: string | null;
  enabled?: boolean;
  templateConfigured?: boolean;
};

export type ChannelCapabilities = {
  email?: ChannelCapability | null;
  whatsapp?: ChannelCapability | null;
};

export type SuppressionMeta = {
  active?: boolean;
  scope?: string | null;
  matchedBy?: string | null;
  source?: string | null;
  reason?: string | null;
  provider?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  personId?: string | null;
  campaignId?: string | null;
  identifiers?: Record<string, unknown> | null;
  legacy?: boolean;
};

export type WhatsAppOptOutItem = {
  id: string;
  scope?: string | null;
  identityType?: string | null;
  identityValue?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  isActive: boolean;
  source: string | null;
  reason: string | null;
  provider: string | null;
  personId: string | null;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListWhatsAppOptOutsResponse = {
  ok: boolean;
  items: WhatsAppOptOutItem[];
};

export type UploadWhatsAppOptOutCsvResponse = {
  ok: boolean;
  filename: string;
  totalRows: number;
  phoneRows: number;
  emailRows: number;
  effectiveRows: number;
  created: number;
  updated: number;
  invalid: number;
};

export type CreateWhatsAppOptOutRequest = {
  phone?: string;
  email?: string;
  leadId?: string;
  reason?: string;
  source?: string;
};

export type CreateWhatsAppOptOutResponse = {
  ok: boolean;
  created: boolean;
  suppressionId?: string;
  isActive: boolean;
  source: string;
  reason: string | null;
  phoneE164: string | null;
  email: string | null;
  personId: string | null;
  campaignId: string | null;
};

export type DisableLeadWhatsAppResponse = {
  ok: boolean;
  created: boolean;
  leadId: string;
  phoneE164: string | null;
  email: string | null;
  isActive: boolean;
  source: string;
  reason: string | null;
};

export type CampaignInfo = {
  campaignId: string;
  name: string | null;
  location: string | null;
  category: string | null;
  date: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CampaignInfoResponse = {
  campaignId: string;
  eventRegistryId?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  campaignType?: CampaignType;
  manualUpload?: boolean;
  campaignSource?: string | null;
  info: CampaignInfo;
};

export type WorkflowStatus = string;

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
  eventName?: string | null;
  canonicalEventKey?: string | null;
  canonicalEventName?: string | null;
  leadIdentityKey?: string | null;
  workflowStatus?: WorkflowStatus | null;
  workflowStatusLabel?: string | null;
  hostIcpRunId?: string | null;
  isManualLead?: boolean | null;
  manualLeadAddedByUserId?: string | null;
  manualLeadAddedByUsername?: string | null;
  manualLeadAddedAt?: string | null;
  reviewStatus?: string | null;
  approvalStatus: "pending" | "approved" | "rejected" | "suppressed";
  outreachStatus?: string | Record<string, unknown> | null;
  isSuppressed?: boolean;
  suppression?: SuppressionMeta | null;
  contactReadOnly?: boolean;
  sendable?: boolean;
  channelCapabilities?: ChannelCapabilities | null;
  emailAttachments?: LeadAttachment[];
  whatsappAttachments?: LeadAttachment[];
};

export type WorkflowStatusUpdateResponse = {
  id: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadIdentityKey: string;
  workflowStatus: WorkflowStatus;
  workflowStatusLabel?: string | null;
  updatedAt?: string | null;
};

export type EventSummaryItem = {
  canonicalEventKey: string;
  canonicalEventName: string;
  leadCount: number;
  campaignCount: number;
  relatedCampaignNames: string[];
  hostIcpRunId?: string | null;
};

export type EventSummaryResponse = {
  events: EventSummaryItem[];
  total: number;
};

export type EventLeadListItem = {
  id: string;
  eventName?: string | null;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadIdentityKey: string;
  employeeName: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  companyUrl?: string | null;
  workflowStatus: WorkflowStatus;
  workflowStatusLabel?: string | null;
  isSuppressed?: boolean;
  suppression?: SuppressionMeta | null;
  contactReadOnly?: boolean;
  isManualLead?: boolean | null;
  manualLeadAddedByUserId?: string | null;
  manualLeadAddedByUsername?: string | null;
  manualLeadAddedAt?: string | null;
};

export type EventLeadListParams = {
  limit?: number;
  offset?: number;
  search?: string;
  workflowStatus?: WorkflowStatus;
  includeManual?: boolean;
  sort?: string;
};

export type EventLeadListResponse = {
  event: EventSummaryItem;
  items: EventLeadListItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type GlobalLeadSearchParams = {
  limit?: number;
  offset?: number;
  search?: string;
  approvalStatus?: string;
  workflowStatus?: WorkflowStatus;
  canonicalEventKey?: string;
  campaignId?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
  hasWebsite?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type GlobalLeadSearchResponse = {
  items: LeadItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type WorkflowStatusDefinitionItem = {
  id: string;
  ownerUserId?: string | null;
  pipeline?: string | null;
  statusKey: string;
  label: string;
  isSystemDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WorkflowStatusDefinitionsResponse = {
  statuses: WorkflowStatusDefinitionItem[];
  total: number;
};

export type EventLeadCreateRequest = {
  fullName: string;
  title?: string;
  companyName?: string;
  companyUrl?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
};

export type EventLeadCreateResponse = {
  id: string;
  hostIcpRunId?: string | null;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadIdentityKey: string;
  workflowStatus: WorkflowStatus;
  workflowStatusLabel?: string | null;
  employeeName: string;
  title?: string | null;
  company?: string | null;
  companyUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  isManualLead?: boolean | null;
  manualLeadAddedByUserId?: string | null;
  manualLeadAddedByUsername?: string | null;
  manualLeadAddedAt?: string | null;
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
  Object.assign(headers, getAuthHeader());
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

export async function getRecentCampaigns(limit?: number) {
  const params = typeof limit === "number" ? { limit } : undefined;
  const { data } = await apiClient.get<{ campaigns: RecentCampaign[] }>(
    "/api/campaigns/recent",
    { params }
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

  const { data } = await apiClient.post<CreateCampaignResponse>("/api/campaigns", requestBody);
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

  const { data } = await apiClient.post<UploadCampaignResponse>("/api/campaigns", formData);
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await apiClient.get<CampaignDetail>(`/api/campaigns/${id}`);
  return data;
}

export async function getCampaignInfo(id: string) {
  const { data } = await apiClient.get<CampaignInfoResponse>(`/api/campaigns/${id}/info`);
  return data;
}

export async function getCampaignLeads(id: string, status: string = "all") {
  const { data } = await apiClient.get<{ leads: LeadItem[]; total: number }>(
    `/api/campaigns/${id}/leads`,
    { params: { status } }
  );
  return data;
}

export async function listAllLeads() {
  const { data } = await apiClient.get<{ leads: LeadItem[]; total: number }>("/api/all/leads");
  return data;
}

export async function searchLeads(params?: GlobalLeadSearchParams) {
  const { data } = await apiClient.get<GlobalLeadSearchResponse>("/api/leads/search", {
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
  const { data } = await apiClient.get<EventSummaryResponse>("/api/events");
  return data;
}

export async function listEventLeads(canonicalEventKey: string, params?: EventLeadListParams) {
  const { data } = await apiClient.get<EventLeadListResponse>(
    `/api/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        search: params?.search,
        workflowStatus: params?.workflowStatus,
        includeManual: params?.includeManual,
        sort: params?.sort,
      },
    }
  );
  return data;
}

export async function listWorkflowStatuses() {
  const { data } = await apiClient.get<WorkflowStatusDefinitionsResponse>("/api/workflow-statuses");
  return data;
}

export async function createWorkflowStatus(label: string) {
  const { data } = await apiClient.post<WorkflowStatusDefinitionItem>("/api/workflow-statuses", {
    label,
  });
  return data;
}

export async function addEventLead(canonicalEventKey: string, payload: EventLeadCreateRequest) {
  const { data } = await apiClient.post<EventLeadCreateResponse>(
    `/api/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    payload
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

export async function updateLeadWorkflowStatus(id: string, workflowStatus: WorkflowStatus) {
  const { data } = await apiClient.put<WorkflowStatusUpdateResponse>(
    `/api/leads/${id}/workflow-status`,
    { workflowStatus }
  );
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

async function requestCampaignDelete(
  client: AxiosInstance,
  url: string
): Promise<DeleteCampaignResult> {
  const response = await client.delete(url, {
    validateStatus: () => true,
  });

  const data = response.data;
  const detail = asRecord(asRecord(data)?.detail);

  if (response.status === 409 && detail?.code === "campaign_delete_blocked") {
    return {
      ok: false,
      blocked: true,
      detail: detail as DeleteBlockedDetail,
    };
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(getDetailMessage(data, "Failed to delete campaign"));
  }

  return {
    ok: true,
    blocked: false,
    data: data as DeleteCampaignResponse,
  };
}

export async function deleteCampaign(id: string) {
  return requestCampaignDelete(apiClient, `/api/campaigns/${id}`);
}

async function requestCampaignForceDelete(
  client: AxiosInstance,
  url: string
): Promise<ForceDeleteCampaignResponse> {
  const response = await client.post(
    url,
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

export async function forceDeleteCampaign(id: string) {
  return requestCampaignForceDelete(apiClient, `/api/campaigns/${id}/force-delete`);
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

  const { data } = await apiClient.post<SendAllCampaignResponse>(
    `/api/campaigns/${campaignId}/send-all?${query.toString()}`,
    formData
  );
  return data;
}

export async function uploadCampaignCommonAttachment(campaignId: string, file: File | Blob) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadCommonAttachmentResponse>(
    `/api/campaigns/${campaignId}/upload-common-attachment`,
    formData
  );
  return data;
}

export async function approveSelectedCampaignLeads(payload: ApproveSelectedLeadsRequest) {
  const { campaignId, leadIds } = payload;
  const { data } = await apiClient.post<ApproveSelectedLeadsResponse>(
    `/api/campaigns/${campaignId}/approve-selected-leads`,
    leadIds
  );
  return data;
}

export async function sendSelectedCampaignLeads(payload: SendSelectedLeadsRequest) {
  const { campaignId, leadIds, attachmentId } = payload;
  const query = new URLSearchParams();
  if (attachmentId) query.set("attachment_id", attachmentId);
  const queryText = query.toString();

  const { data } = await apiClient.post<SendSelectedLeadsResponse>(
    `/api/campaigns/${campaignId}/send-selected-leads${queryText ? `?${queryText}` : ""}`,
    leadIds
  );
  return data;
}

export async function listWhatsAppOptOuts(params?: {
  limit?: number;
  activeOnly?: boolean;
}) {
  const { data } = await apiClient.get<ListWhatsAppOptOutsResponse>(
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

  const { data } = await apiClient.post<UploadWhatsAppOptOutCsvResponse>(
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
  const { data } = await apiClient.post<CreateWhatsAppOptOutResponse>(
    "/api/marketing/opt-outs",
    body
  );
  return data;
}

export async function disableLeadWhatsApp(leadId: string, reason?: string) {
  const { data } = await apiClient.post<DisableLeadWhatsAppResponse>(
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
  const { data } = await apiClient.get<{
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
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      waDebugLog("poll.skip_hidden", { personId, tickCount });
      return;
    }

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

api.interceptors.request.use(attachAuthToken);
