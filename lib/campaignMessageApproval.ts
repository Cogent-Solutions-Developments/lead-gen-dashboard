export type CampaignMessageChannel = "email" | "linkedin";
export type CampaignMessageApprovalStatus = "pending" | "approved" | "rejected";

type CampaignMessageApprovalLead = {
  approvalStatus?: string | null;
  channelApprovals?: Partial<Record<CampaignMessageChannel, CampaignMessageApprovalStatus>>;
  contentSource?: string | null;
  contentEmail?: string | null;
  contentLinkedin?: string | null;
};

const READY_CONTENT_SOURCES = new Set(["generated", "manual"]);

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Generated and manually saved messages do not use the template auto-approval
 * path. Treat their real channel content as ready while preserving explicit
 * approval/rejection decisions and the legacy email approval fallback.
 */
export function resolveCampaignMessageApproval(
  lead: CampaignMessageApprovalLead,
  channel: CampaignMessageChannel
): CampaignMessageApprovalStatus {
  const persisted = lead.channelApprovals?.[channel];
  if (persisted === "approved" || persisted === "rejected") return persisted;

  const contentSource = String(lead.contentSource || "").trim().toLowerCase();
  const hasChannelContent =
    channel === "email" ? hasText(lead.contentEmail) : hasText(lead.contentLinkedin);

  if (READY_CONTENT_SOURCES.has(contentSource) && hasChannelContent) return "approved";
  if (persisted === "pending") return "pending";

  return channel === "email" && lead.approvalStatus === "approved" ? "approved" : "pending";
}
