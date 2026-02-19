import * as sales from "@/lib/api";
import * as delegates from "@/lib/apidele";
import { getPersona, type Persona } from "@/lib/persona";

export type {
  CampaignDetail,
  CampaignListItem,
  DashboardStats,
  LeadItem,
  MessageStatus,
  RecentCampaign,
  ReplyNotification,
} from "@/lib/api";

const pickModule = (persona?: Persona) =>
  (persona ?? getPersona()) === "delegates" ? delegates : sales;

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

export const getCampaign: typeof sales.getCampaign = (...args) =>
  pickModule().getCampaign(...args);

export const getCampaignLeads: typeof sales.getCampaignLeads = (...args) =>
  pickModule().getCampaignLeads(...args);

export const approveLead: typeof sales.approveLead = (...args) =>
  pickModule().approveLead(...args);

export const rejectLead: typeof sales.rejectLead = (...args) =>
  pickModule().rejectLead(...args);

export const updateLeadContent: typeof sales.updateLeadContent = (...args) =>
  pickModule().updateLeadContent(...args);

export const approveAllCampaign: typeof sales.approveAllCampaign = (...args) =>
  pickModule().approveAllCampaign(...args);

export const startOutreach: typeof sales.startOutreach = (...args) =>
  pickModule().startOutreach(...args);

export const exportCampaignCsvUrl: typeof sales.exportCampaignCsvUrl = (...args) =>
  pickModule().exportCampaignCsvUrl(...args);

export const stopCampaign: typeof sales.stopCampaign = (...args) =>
  pickModule().stopCampaign(...args);

export const listReplyNotifications: typeof sales.listReplyNotifications = (...args) =>
  pickModule().listReplyNotifications(...args);

export const listMessageStatuses: typeof sales.listMessageStatuses = (...args) =>
  pickModule().listMessageStatuses(...args);

export const markReplyAsRead: typeof sales.markReplyAsRead = (...args) =>
  pickModule().markReplyAsRead(...args);

export function getApiKeyClient(persona?: Persona) {
  return pickModule(persona).api;
}
