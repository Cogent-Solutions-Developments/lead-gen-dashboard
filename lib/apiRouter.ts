import * as sales from "@/lib/api";
import * as delegates from "@/lib/apidele";
import * as production from "@/lib/apiproduction";
import { getPersona, type Persona } from "@/lib/persona";

export type {
  CampaignImportSummary,
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
  DeleteCampaignResult,
  EventLeadCreateRequest,
  EventLeadCreateResponse,
  EventLeadListItem,
  EventLeadListParams,
  EventLeadListResponse,
  EventSummaryItem,
  EventSummaryResponse,
  ForceDeleteCampaignResponse,
  LeadItem,
  LeadAttachment,
  MessageStatus,
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

export const getCampaign: typeof sales.getCampaign = (...args) =>
  pickModule().getCampaign(...args);

export const getCampaignInfo: typeof sales.getCampaignInfo = (...args) =>
  pickModule().getCampaignInfo(...args);

export const getCampaignLeads: typeof sales.getCampaignLeads = (...args) =>
  pickModule().getCampaignLeads(...args);

export const listAllLeads: typeof sales.listAllLeads = (...args) =>
  pickModule().listAllLeads(...args);

export const listEvents: typeof sales.listEvents = (...args) =>
  pickModule().listEvents(...args);

export const listEventLeads: typeof sales.listEventLeads = (...args) =>
  pickModule().listEventLeads(...args);

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

export const updateLeadWorkflowStatus: typeof sales.updateLeadWorkflowStatus = (...args) =>
  pickModule().updateLeadWorkflowStatus(...args);

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
