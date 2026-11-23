export type LinkedInPage = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

export type LinkedInPageInput = Pick<LinkedInPage, "name" | "url">;

export type LinkedInCampaign = {
  id: string;
  pageId: string;
  name: string;
  fileName: string;
  eventKey?: string | null;
  totalLeads: number;
  importSummary: { raw_rows: number; invalid_rows: number; duplicates_collapsed: number };
  status: "uploaded";
  createdAt: string;
  createdBy: string;
};

export type LinkedInCampaignList = { campaigns: LinkedInCampaign[]; total: number; hasMore: boolean };
export type LinkedInCampaignLead = { id: string; name: string; jobTitle: string; company: string; email: string; phone: string; linkedinUrl: string };
export type LinkedInCampaignDetail = {
  page: LinkedInPage;
  campaign: LinkedInCampaign;
  items: LinkedInCampaignLead[];
  total: number;
  hasMore: boolean;
};

export function linkedInPageError(error: unknown) {
  const detail = (error as { data?: { detail?: unknown } } | null)?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const message = detail.find((item) => typeof item?.msg === "string")?.msg;
    if (message) return message.replace(/^Value error, /, "");
  }
  return error instanceof Error ? error.message : "Please try again.";
}
