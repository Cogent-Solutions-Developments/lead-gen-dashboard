import * as sales from "@/lib/api";
import * as delegates from "@/lib/apidele";
import * as production from "@/lib/apiproduction";
import { getPersona, type Persona } from "@/lib/persona";

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

export const listEventAgendas: typeof sales.listEventAgendas = (...args) =>
  sales.listEventAgendas(...args);

export const downloadEventAgendaFile: typeof sales.downloadEventAgendaFile = (...args) =>
  sales.downloadEventAgendaFile(...args);

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

export const generateLeadEmailContent: typeof sales.generateLeadEmailContent = (...args) =>
  pickModule().generateLeadEmailContent(...args);

export const generateLeadContent: typeof sales.generateLeadContent = (...args) =>
  pickModule().generateLeadContent(...args);

export const updateLeadWorkflowStatus: typeof sales.updateLeadWorkflowStatus = (...args) =>
  pickModule().updateLeadWorkflowStatus(...args);

export const getLeadWorkflowStatusHistory: typeof sales.getLeadWorkflowStatusHistory = (...args) =>
  pickModule().getLeadWorkflowStatusHistory(...args);

export const approveAllCampaign: typeof sales.approveAllCampaign = (...args) =>
  pickModule().approveAllCampaign(...args);

export const startOutreach: typeof sales.startOutreach = (...args) =>
  pickModule().startOutreach(...args);

export const exportCampaignCsvUrl: typeof sales.exportCampaignCsvUrl = (...args) =>
  pickModule().exportCampaignCsvUrl(...args);

export const stopCampaign: typeof sales.stopCampaign = (...args) =>
  pickModule().stopCampaign(...args);

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
