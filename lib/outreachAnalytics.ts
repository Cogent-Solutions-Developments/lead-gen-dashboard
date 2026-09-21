import { apiClient } from "@/lib/apiClient";
import type { CampaignListItem, CampaignListResponse } from "@/lib/api";

export type OutreachDepartment = "sales" | "delegate-sales" | "delegates" | "production";

export const outreachDepartments: { value: OutreachDepartment; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "delegate-sales", label: "Delegate Sales" },
  { value: "delegates", label: "Delegates" },
  { value: "production", label: "Production" },
];

const campaignPaths: Record<OutreachDepartment, string> = {
  sales: "/api/campaigns",
  "delegate-sales": "/api/delegate-sales/campaigns",
  delegates: "/api/delegates/campaigns",
  production: "/api/productions/campaigns",
};

export type OutreachAnalyticsSummary = {
  campaignId: string;
  counts: {
    tracked: number;
    sent: number;
    failed: number;
    estimatedDelivered: number;
    opened: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    complaints: number;
  };
  rates: {
    sendSuccessRate: number;
    deliveryRateEstimated: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    complaintRate: number;
  };
  definitions: {
    estimatedDelivered: string;
    openRate: string;
    replyRate: string;
  };
};

export async function listOutreachCampaigns(
  department: OutreachDepartment,
  params: { limit: number; offset: number; search?: string },
  signal?: AbortSignal,
): Promise<CampaignListResponse> {
  const { data } = await apiClient.get<CampaignListResponse>(campaignPaths[department], {
    params,
    signal,
  });
  return data;
}

export async function getOutreachCampaignSummary(
  department: OutreachDepartment,
  campaignId: CampaignListItem["id"],
  signal?: AbortSignal,
): Promise<OutreachAnalyticsSummary> {
  const { data } = await apiClient.get<OutreachAnalyticsSummary>(
    `${campaignPaths[department]}/${encodeURIComponent(campaignId)}/outreach-analytics`,
    { signal },
  );
  return data;
}
