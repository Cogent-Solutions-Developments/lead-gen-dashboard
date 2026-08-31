export type CampaignMessageChannel = "email" | "linkedin";
export type CampaignMessageApprovalStatus = "pending" | "approved" | "rejected";

type CampaignMessageApprovalLead = {
  approvalStatus?: string | null;
  channelApprovals?: Partial<Record<CampaignMessageChannel, CampaignMessageApprovalStatus>>;
  contentEmail?: string | null;
  contentLinkedin?: string | null;
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasCampaignMessageContent(
  lead: CampaignMessageApprovalLead,
  channel: CampaignMessageChannel
): boolean {
  return channel === "email" ? hasText(lead.contentEmail) : hasText(lead.contentLinkedin);
}

/**
 * Generated and manually saved messages do not consistently receive source or
 * auto-approval metadata. Treat real channel content as ready while preserving
 * explicit approval/rejection decisions and the legacy email approval fallback.
 */
export function resolveCampaignMessageApproval(
  lead: CampaignMessageApprovalLead,
  channel: CampaignMessageChannel
): CampaignMessageApprovalStatus {
  const persisted = lead.channelApprovals?.[channel];
  if (persisted === "approved" || persisted === "rejected") return persisted;

  if (hasCampaignMessageContent(lead, channel)) return "approved";
  if (persisted === "pending") return "pending";

  return channel === "email" && lead.approvalStatus === "approved" ? "approved" : "pending";
}
