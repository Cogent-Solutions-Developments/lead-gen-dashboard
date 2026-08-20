import * as sales from "@/lib/api";
import * as delegates from "@/lib/apidele";
import * as production from "@/lib/apiproduction";
import { apiClient } from "@/lib/apiClient";
import { getPersona, type Persona } from "@/lib/persona";

type DepartmentPersona = Extract<Persona, "sales" | "delegates" | "production">;

export type {
  CampaignImportSummary,
  CampaignEmailTemplate,
  CampaignEmailTemplateDeleteResponse,
  CampaignEmailTemplateDeleteFallbackDrafts,
  CampaignEmailTemplateFallbackDrafts,
  CampaignEmailTemplatePayload,
  CampaignEmailTemplateResponse,
  CampaignEmailTemplateSaveResponse,
  EmailTemplateContentSource,
  CampaignInfo,
  CampaignInfoResponse,
  CampaignDetail,
  CampaignListItem,
  CampaignListParams,
  CampaignListResponse,
  CampaignType,
  CreateCampaignRequest,
  CreateCampaignResponse,
  DeleteBlockedDetail,
  DeleteBlocker,
  DeleteCampaignResponse,
  DashboardStats,
  DashboardPeriod,
  DashboardKpiLeaderboard,
  DashboardKpiRunner,
  DashboardPersonalStatsItem,
  DashboardPersonalSummary,
  DeleteCampaignResult,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventLeadCategoryCount,
  EventLeadListItem,
  EventLeadListParams,
  EventLeadListResponse,
  EventAgendaItem,
  EventAgendaListResponse,
  EventAgendaUploadResponse,
  EventDocumentDeleteResponse,
  EventDocumentItem,
  EventDocumentListResponse,
  EventDocumentType,
  EventDocumentUploadResponse,
  GlobalLeadSearchParams,
  GlobalLeadSearchResponse,
  EventSummaryItem,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  LeadEmailGenerationRequest,
  LeadEmailGenerationResponse,
  LeadContentGenerationRequest,
  LeadContentGenerationResponse,
  LeadContentPlatform,
  LeadTemplateCategorySummary,
  LeadTemplateValidationResponse,
  LeadItem,
  MyLeadEditPermissions,
  MyLeadUpdateRequest,
  MyLeadUpdateResponse,
  LeadDepartmentTag,
  LeadOriginHistoryItem,
  LeadOriginSource,
  LeadOwnerHistoryResponse,
  LeadOwnerSummary,
  LeadUploadDuplicate,
  LeadAttachment,
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
  ChannelCapability,
  ChannelCapabilities,
  OutreachRequestChannel,
  RequestedOutreachChannels,
  SendAllCampaignChannels,
  SendAllCampaignRequest,
  SendAllCampaignResponse,
  UploadCommonAttachmentResponse,
  UploadCampaignRequest,
  UploadCampaignResponse,
  ApproveSelectedLeadsRequest,
  ApproveSelectedLeadsResponse,
  GenerateSelectedLeadContentRequest,
  GenerateSelectedLeadContentResponse,
  ResetLeadContentResponse,
  ResetSelectedLeadContentRequest,
  ResetSelectedLeadContentResponse,
  SendSelectedLeadsRequest,
  SendSelectedLeadsResponse,
  SendAdminLeadSmsResponse,
  CreateWhatsAppOptOutRequest,
  CreateWhatsAppOptOutResponse,
  ListWhatsAppOptOutsResponse,
  UploadWhatsAppOptOutCsvResponse,
  DisableLeadWhatsAppResponse,
  WhatsAppOptOutItem,
  SuppressionMeta,
  WorkflowStatus,
  WorkflowStatusDefinitionItem,
  WorkflowStatusDefinitionsResponse,
  WorkflowStatusHistoryItem,
  WorkflowStatusHistoryResponse,
  WorkflowStatusUpdateResponse,
  WhatsAppInbound,
  WhatsAppMessagesResponse,
  WhatsAppNotificationsResponse,
} from "@/lib/api";

const pickModule = (persona?: Persona) => {
  const selected = persona ?? getPersona();
  if (selected === "delegates") return delegates;
  if (selected === "production") return production;
  return sales;
};

const getMyLeadsPrefix = (persona?: Persona) => {
  const selected = persona ?? getPersona();
  if (selected === "delegates") return "/api/delegates/my-leads";
  if (selected === "production") return "/api/productions/my-leads";
  return "/api/my-leads";
};

function appendUploadCampaignFormData(payload: sales.UploadCampaignRequest) {
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
  return formData;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 500);
}

export const getDashboardStats: typeof sales.getDashboardStats = (...args) =>
  pickModule().getDashboardStats(...args);

export const getDashboardPersonalSummary: typeof sales.getDashboardPersonalSummary = (...args) =>
  pickModule().getDashboardPersonalSummary(...args);

export const getDashboardKpiLeaderboard: typeof sales.getDashboardKpiLeaderboard = (...args) =>
  pickModule().getDashboardKpiLeaderboard(...args);

export const getDashboardDistribution: typeof sales.getDashboardDistribution = (...args) =>
  pickModule().getDashboardDistribution(...args);

export const getRecentCampaigns: typeof sales.getRecentCampaigns = (...args) =>
  pickModule().getRecentCampaigns(...args);

export const listCampaigns: typeof sales.listCampaigns = (...args) =>
  pickModule().listCampaigns(...args);

export const createCampaign: typeof sales.createCampaign = (...args) =>
  pickModule().createCampaign(...args);

export const createCampaignFromUpload: typeof sales.createCampaignFromUpload = (...args) =>
  pickModule().createCampaignFromUpload(...args);

export const validateLeadTemplateUpload: typeof sales.validateLeadTemplateUpload = (...args) =>
  pickModule().validateLeadTemplateUpload(...args);

export const downloadLeadTemplateFile: typeof sales.downloadLeadTemplateFile = (...args) =>
  pickModule().downloadLeadTemplateFile(...args);

export const getMyRecentCampaigns: typeof sales.getMyRecentCampaigns = (...args) =>
  pickModule().getMyRecentCampaigns(...args);

export const listMyCampaigns: typeof sales.listMyCampaigns = (...args) =>
  pickModule().listMyCampaigns(...args);

export const createMyCampaignFromUpload: typeof sales.createMyCampaignFromUpload = (...args) =>
  pickModule().createMyCampaignFromUpload(...args);

export const validateMyLeadTemplateUpload: typeof sales.validateMyLeadTemplateUpload = (...args) =>
  pickModule().validateMyLeadTemplateUpload(...args);

export const downloadMyLeadTemplateFile: typeof sales.downloadMyLeadTemplateFile = (...args) =>
  pickModule().downloadMyLeadTemplateFile(...args);

export const getMyCampaign: typeof sales.getMyCampaign = (...args) =>
  pickModule().getMyCampaign(...args);

export const exportMyCampaignCsvUrl: typeof sales.exportMyCampaignCsvUrl = (...args) =>
  pickModule().exportMyCampaignCsvUrl(...args);

export const getMyCampaignLeads: typeof sales.getMyCampaignLeads = (...args) =>
  pickModule().getMyCampaignLeads(...args);

export const listMyAllLeads: typeof sales.listMyAllLeads = (...args) =>
  pickModule().listMyAllLeads(...args);

export const searchMyLeads: typeof sales.searchMyLeads = (...args) =>
  pickModule().searchMyLeads(...args);

export const listMyEvents: typeof sales.listMyEvents = (...args) =>
  pickModule().listMyEvents(...args);

export const listMyEventLeads: typeof sales.listMyEventLeads = (...args) =>
  pickModule().listMyEventLeads(...args);

export const addMyEventLead: typeof sales.addMyEventLead = (...args) =>
  pickModule().addMyEventLead(...args);

export async function updateMyLead(
  id: string,
  payload: sales.MyLeadUpdateRequest,
  persona?: Persona
) {
  const { data } = await apiClient.patch<sales.MyLeadUpdateResponse>(
    `${getMyLeadsPrefix(persona)}/leads/${encodeURIComponent(id)}`,
    payload
  );
  return data;
}

export const getCampaign: typeof sales.getCampaign = (...args) =>
  pickModule().getCampaign(...args);

export const getCampaignInfo: typeof sales.getCampaignInfo = (...args) =>
  pickModule().getCampaignInfo(...args);

export const getCampaignEmailTemplate: typeof sales.getCampaignEmailTemplate = (...args) =>
  pickModule().getCampaignEmailTemplate(...args);

export const saveCampaignEmailTemplate: typeof sales.saveCampaignEmailTemplate = (...args) =>
  pickModule().saveCampaignEmailTemplate(...args);

export const deleteCampaignEmailTemplate: typeof sales.deleteCampaignEmailTemplate = (...args) =>
  pickModule().deleteCampaignEmailTemplate(...args);

export const getCampaignLeads: typeof sales.getCampaignLeads = (...args) =>
  pickModule().getCampaignLeads(...args);

export const listAllLeads: typeof sales.listAllLeads = (...args) =>
  pickModule().listAllLeads(...args);

export const searchLeads: typeof sales.searchLeads = (...args) =>
  pickModule().searchLeads(...args);

export const listEvents: typeof sales.listEvents = (...args) =>
  pickModule().listEvents(...args);

export const listEventLeads: typeof sales.listEventLeads = (...args) =>
  pickModule().listEventLeads(...args);

export function listEventsForPersona(persona: DepartmentPersona): ReturnType<typeof sales.listEvents> {
  return pickModule(persona).listEvents();
}

export function listEventLeadsForPersona(
  persona: DepartmentPersona,
  canonicalEventKey: string,
  params?: sales.EventLeadListParams
): ReturnType<typeof sales.listEventLeads> {
  return pickModule(persona).listEventLeads(canonicalEventKey, params);
}

export function createCampaignFromUploadForPersona(
  persona: DepartmentPersona,
  payload: sales.UploadCampaignRequest
): ReturnType<typeof sales.createCampaignFromUpload> {
  return pickModule(persona).createCampaignFromUpload(payload);
}

export function validateLeadTemplateUploadForPersona(
  persona: DepartmentPersona,
  file: File | Blob,
  eventRegistryId?: string
): ReturnType<typeof sales.validateLeadTemplateUpload> {
  return pickModule(persona).validateLeadTemplateUpload(file, eventRegistryId);
}

export function downloadLeadTemplateFileForPersona(
  persona: DepartmentPersona,
  fileName?: string
): ReturnType<typeof sales.downloadLeadTemplateFile> {
  return pickModule(persona).downloadLeadTemplateFile(fileName);
}

export async function getMyLeadsRecentCampaigns(limit?: number, persona?: Persona) {
  const params = typeof limit === "number" ? { limit } : undefined;
  const { data } = await apiClient.get<{ campaigns: sales.RecentCampaign[] }>(
    `${getMyLeadsPrefix(persona)}/campaigns/recent`,
    { params }
  );
  return data;
}

export async function listMyLeadsCampaigns(
  params: { status?: string; limit?: number; offset?: number },
  persona?: Persona
) {
  const { data } = await apiClient.get<{
    campaigns: sales.CampaignListItem[];
    total: number;
    hasMore: boolean;
  }>(`${getMyLeadsPrefix(persona)}/campaigns`, { params });
  return data;
}

export async function createMyLeadsCampaignFromUpload(
  payload: sales.UploadCampaignRequest,
  persona?: Persona
) {
  const { data } = await apiClient.post<sales.UploadCampaignResponse>(
    `${getMyLeadsPrefix(persona)}/campaigns`,
    appendUploadCampaignFormData(payload)
  );
  return data;
}

export async function validateMyLeadsLeadTemplateUpload(
  file: File | Blob,
  persona?: Persona,
  eventRegistryId?: string
) {
  const formData = new FormData();
  const fileName =
    typeof File !== "undefined" && file instanceof File && file.name
      ? file.name
      : "lead-upload-template.xlsx";

  formData.append("leadSheet", file, fileName);
  if (eventRegistryId?.trim()) formData.append("eventRegistryId", eventRegistryId.trim());

  const { data } = await apiClient.post<sales.LeadTemplateValidationResponse>(
    `${getMyLeadsPrefix(persona)}/lead-template/validate`,
    formData
  );
  return data;
}

export async function downloadMyLeadsLeadTemplateFile(
  fileName = "lead-upload-template.xlsx",
  persona?: Persona
) {
  const { data } = await apiClient.get<Blob>(`${getMyLeadsPrefix(persona)}/lead-template`, {
    responseType: "blob",
  });
  triggerBlobDownload(data, fileName || "lead-upload-template.xlsx");
}

export async function getMyLeadsCampaign(id: string, persona?: Persona) {
  const { data } = await apiClient.get<sales.CampaignDetail>(
    `${getMyLeadsPrefix(persona)}/campaigns/${encodeURIComponent(id)}`
  );
  return data;
}

export async function downloadMyLeadsCampaignExport(
  id: string,
  fileName = "my-leads-campaign.csv",
  persona?: Persona
) {
  const { data } = await apiClient.get<Blob>(
    `${getMyLeadsPrefix(persona)}/campaigns/${encodeURIComponent(id)}/export`,
    { responseType: "blob" }
  );
  triggerBlobDownload(data, fileName || "my-leads-campaign.csv");
}

export function exportMyLeadsCampaignCsvUrl(id: string, persona?: Persona) {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL}${getMyLeadsPrefix(persona)}/campaigns/${encodeURIComponent(id)}/export`;
}

export async function getMyLeadsCampaignLeads(id: string, status: string = "all", persona?: Persona) {
  const { data } = await apiClient.get<{ leads: sales.LeadItem[]; total: number }>(
    `${getMyLeadsPrefix(persona)}/campaigns/${encodeURIComponent(id)}/leads`,
    { params: { status } }
  );
  return data;
}

export async function listMyLeadsAllLeads(persona?: Persona) {
  const { data } = await apiClient.get<{ leads: sales.LeadItem[]; total: number }>(
    `${getMyLeadsPrefix(persona)}/all/leads`
  );
  return data;
}

export async function listMyLeadsEvents(persona?: Persona) {
  const { data } = await apiClient.get<sales.EventSummaryResponse>(`${getMyLeadsPrefix(persona)}/events`);
  return data;
}

export async function listMyLeadsEventLeads(
  canonicalEventKey: string,
  params?: sales.EventLeadListParams,
  persona?: Persona
) {
  const { data } = await apiClient.get<sales.EventLeadListResponse>(
    `${getMyLeadsPrefix(persona)}/events/${encodeURIComponent(canonicalEventKey)}/leads`,
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

export async function addMyLeadsEventLead(
  canonicalEventKey: string,
  payload: sales.EventLeadCreateRequest,
  persona?: Persona
) {
  const { data } = await apiClient.post<sales.EventLeadCreateResponse>(
    `${getMyLeadsPrefix(persona)}/events/${encodeURIComponent(canonicalEventKey)}/leads`,
    payload
  );
  return data;
}

export const listEventAgendas: typeof sales.listEventAgendas = (...args) =>
  sales.listEventAgendas(...args);

export const downloadEventAgendaFile: typeof sales.downloadEventAgendaFile = (...args) =>
  sales.downloadEventAgendaFile(...args);

export const listEventDocuments: typeof sales.listEventDocuments = (...args) =>
  sales.listEventDocuments(...args);

export const downloadEventDocumentFile: typeof sales.downloadEventDocumentFile = (...args) =>
  sales.downloadEventDocumentFile(...args);

export const nizoAiChat: typeof sales.nizoAiChat = (...args) =>
  pickModule().nizoAiChat(...args);

export const searchNizoAiMentions: typeof sales.searchNizoAiMentions = (...args) =>
  pickModule().searchNizoAiMentions(...args);

export const listWorkflowStatuses: typeof sales.listWorkflowStatuses = (...args) =>
  pickModule().listWorkflowStatuses(...args);

export const createWorkflowStatus: typeof sales.createWorkflowStatus = (...args) =>
  pickModule().createWorkflowStatus(...args);

export const addEventLead: typeof sales.addEventLead = (...args) =>
  pickModule().addEventLead(...args);

export const approveLead: typeof sales.approveLead = (...args) =>
  pickModule().approveLead(...args);

export const rejectLead: typeof sales.rejectLead = (...args) =>
  pickModule().rejectLead(...args);

export const updateLeadContent: typeof sales.updateLeadContent = (...args) =>
  pickModule().updateLeadContent(...args);

export const resetLeadContent: typeof sales.resetLeadContent = (...args) =>
  pickModule().resetLeadContent(...args);

export const generateLeadEmailContent: typeof sales.generateLeadEmailContent = (...args) =>
  pickModule().generateLeadEmailContent(...args);

export const generateLeadContent: typeof sales.generateLeadContent = (...args) =>
  pickModule().generateLeadContent(...args);

export const updateLeadWorkflowStatus: typeof sales.updateLeadWorkflowStatus = (...args) =>
  pickModule().updateLeadWorkflowStatus(...args);

export const getLeadWorkflowStatusHistory: typeof sales.getLeadWorkflowStatusHistory = (...args) =>
  pickModule().getLeadWorkflowStatusHistory(...args);

export const getLeadOwnerHistory: typeof sales.getLeadOwnerHistory = (...args) =>
  pickModule().getLeadOwnerHistory(...args);

export function listWorkflowStatusesForPersona(
  persona: DepartmentPersona
): ReturnType<typeof sales.listWorkflowStatuses> {
  return pickModule(persona).listWorkflowStatuses();
}

export function createWorkflowStatusForPersona(
  persona: DepartmentPersona,
  label: string
): ReturnType<typeof sales.createWorkflowStatus> {
  return pickModule(persona).createWorkflowStatus(label);
}

export function addEventLeadForPersona(
  persona: DepartmentPersona,
  canonicalEventKey: string,
  payload: sales.EventLeadCreateRequest
): ReturnType<typeof sales.addEventLead> {
  return pickModule(persona).addEventLead(canonicalEventKey, payload);
}

export function generateLeadContentForPersona(
  persona: DepartmentPersona,
  id: string,
  payload: sales.LeadContentGenerationRequest
): ReturnType<typeof sales.generateLeadContent> {
  return pickModule(persona).generateLeadContent(id, payload);
}

export function updateLeadWorkflowStatusForPersona(
  persona: DepartmentPersona,
  id: string,
  workflowStatus: sales.WorkflowStatus,
  comment?: string,
  dealAmountUsd?: string
): ReturnType<typeof sales.updateLeadWorkflowStatus> {
  return pickModule(persona).updateLeadWorkflowStatus(id, workflowStatus, comment, dealAmountUsd);
}

export function getLeadWorkflowStatusHistoryForPersona(
  persona: DepartmentPersona,
  id: string
): ReturnType<typeof sales.getLeadWorkflowStatusHistory> {
  return pickModule(persona).getLeadWorkflowStatusHistory(id);
}

export function getLeadOwnerHistoryForPersona(
  persona: DepartmentPersona,
  id: string
): ReturnType<typeof sales.getLeadOwnerHistory> {
  return pickModule(persona).getLeadOwnerHistory(id);
}

export const approveAllCampaign: typeof sales.approveAllCampaign = (...args) =>
  pickModule().approveAllCampaign(...args);

export const startOutreach: typeof sales.startOutreach = (...args) =>
  pickModule().startOutreach(...args);

export const exportCampaignCsvUrl: typeof sales.exportCampaignCsvUrl = (...args) =>
  pickModule().exportCampaignCsvUrl(...args);

export const stopCampaign: typeof sales.stopCampaign = (...args) =>
  pickModule().stopCampaign(...args);

export const cancelCampaignContentGenerationJob: typeof sales.cancelCampaignContentGenerationJob = (...args) =>
  pickModule().cancelCampaignContentGenerationJob(...args);

export const deleteCampaign: typeof sales.deleteCampaign = (...args) =>
  pickModule().deleteCampaign(...args);

export const forceDeleteCampaign: typeof sales.forceDeleteCampaign = (...args) =>
  pickModule().forceDeleteCampaign(...args);

export const sendAllCampaignLeads: typeof sales.sendAllCampaignLeads = (...args) =>
  pickModule().sendAllCampaignLeads(...args);

export const uploadCampaignCommonAttachment: typeof sales.uploadCampaignCommonAttachment = (...args) =>
  pickModule().uploadCampaignCommonAttachment(...args);

export const approveSelectedCampaignLeads: typeof sales.approveSelectedCampaignLeads = (...args) =>
  pickModule().approveSelectedCampaignLeads(...args);

export const generateSelectedCampaignLeadContent: typeof sales.generateSelectedCampaignLeadContent = (...args) =>
  pickModule().generateSelectedCampaignLeadContent(...args);

export const generateCampaignLeadContent: typeof sales.generateCampaignLeadContent = (...args) =>
  pickModule().generateCampaignLeadContent(...args);

export const resetSelectedCampaignLeadContent: typeof sales.resetSelectedCampaignLeadContent = (...args) =>
  pickModule().resetSelectedCampaignLeadContent(...args);

export const sendSelectedCampaignLeads: typeof sales.sendSelectedCampaignLeads = (...args) =>
  pickModule().sendSelectedCampaignLeads(...args);

export const listWhatsAppOptOuts: typeof sales.listWhatsAppOptOuts = (...args) =>
  pickModule().listWhatsAppOptOuts(...args);

export const uploadWhatsAppOptOutCsv: typeof sales.uploadWhatsAppOptOutCsv = (...args) =>
  pickModule().uploadWhatsAppOptOutCsv(...args);

export const createWhatsAppOptOut: typeof sales.createWhatsAppOptOut = (...args) =>
  pickModule().createWhatsAppOptOut(...args);

export const disableLeadWhatsApp: typeof sales.disableLeadWhatsApp = (...args) =>
  pickModule().disableLeadWhatsApp(...args);

export const sendAdminLeadSms: typeof sales.sendAdminLeadSms = (...args) =>
  sales.sendAdminLeadSms(...args);

export const listReplyNotifications: typeof sales.listReplyNotifications = (...args) =>
  pickModule().listReplyNotifications(...args);

export const listMessageStatuses: typeof sales.listMessageStatuses = (...args) =>
  pickModule().listMessageStatuses(...args);

export const markReplyAsRead: typeof sales.markReplyAsRead = (...args) =>
  pickModule().markReplyAsRead(...args);

// WhatsApp inbound is shared for all personas (single backend stream)
export const fetchInbound: typeof sales.fetchInbound = (...args) =>
  sales.fetchInbound(...args);

export const fetchWhatsAppNotifications: typeof sales.fetchWhatsAppNotifications = (...args) =>
  sales.fetchWhatsAppNotifications(...args);

export const fetchMessages: typeof sales.fetchMessages = (...args) =>
  sales.fetchMessages(...args);

export const startWhatsAppPolling: typeof sales.startWhatsAppPolling = (...args) =>
  sales.startWhatsAppPolling(...args);

export const fetchUnreadCount: typeof sales.fetchUnreadCount = (...args) =>
  sales.fetchUnreadCount(...args);

export const markRead: typeof sales.markRead = (...args) =>
  sales.markRead(...args);

export function getApiKeyClient(persona?: Persona) {
  return pickModule(persona).api;
}

export async function saveCampaignHeyReachCampaignId(
  campaignId: string,
  heyreachCampaignId: string,
  persona?: Persona
) {
  const selected = persona ?? getPersona();
  const prefix = selected === "delegates" ? "/api/delegates" : selected === "production" ? "/api/productions" : "/api";
  const { data } = await getApiKeyClient(selected).post(
    `${prefix}/campaigns/${encodeURIComponent(campaignId)}/info`,
    { heyreachCampaignId }
  );
  return data as { ok: boolean; info?: { heyreachCampaignId?: string | null } };
}

export async function saveCampaignLinkedInSetup(
  campaignId: string,
  payload: { heyreachCampaignId: string; linkedinTemplateBody: string },
  persona?: Persona
) {
  const selected = persona ?? getPersona();
  const prefix = selected === "delegates" ? "/api/delegates" : selected === "production" ? "/api/productions" : "/api";
  const { data } = await getApiKeyClient(selected).post(
    `${prefix}/campaigns/${encodeURIComponent(campaignId)}/info`,
    payload
  );
  return data as { ok: boolean; info?: { heyreachCampaignId?: string | null; linkedinTemplateBody?: string | null } };
}

export async function sendCampaignLeadLinkedin(leadId: string, persona?: Persona) {
  const selected = persona ?? getPersona();
  const prefix = selected === "delegates" ? "/api/delegates" : selected === "production" ? "/api/productions" : "/api";
  return getApiKeyClient(selected).post(`${prefix}/leads/${encodeURIComponent(leadId)}/send-linkedin`);
}
