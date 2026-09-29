export const CAMPAIGN_PAGE_QUERY_PARAM = "page";
export const CAMPAIGN_RETURN_PAGE_QUERY_PARAM = "fromPage";
export const CAMPAIGN_SELECTED_QUERY_PARAM = "selected";

export type CampaignFilterSnapshot = {
  eventName: string;
  date: string;
  categories: string[];
};

export function didCampaignFiltersChange(
  previous: CampaignFilterSnapshot | null,
  current: CampaignFilterSnapshot
) {
  if (!previous) return false;
  const previousCategories = new Set(previous.categories.map((value) => value.trim().toLowerCase()));
  const currentCategories = new Set(current.categories.map((value) => value.trim().toLowerCase()));
  return (
    previous.eventName !== current.eventName ||
    previous.date !== current.date ||
    previousCategories.size !== currentCategories.size ||
    [...previousCategories].some((value) => !currentCategories.has(value))
  );
}

export function parseCampaignPageParam(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

export function buildCampaignDetailHref(campaignId: string, page: number) {
  const safePage = parseCampaignPageParam(String(page));
  const params = new URLSearchParams();

  if (safePage > 1) {
    params.set(CAMPAIGN_RETURN_PAGE_QUERY_PARAM, String(safePage));
  }

  const query = params.toString();
  const pathname = `/campaigns/${encodeURIComponent(campaignId)}`;
  return query ? `${pathname}?${query}` : pathname;
}

export function buildCampaignListReturnHref(page: number, campaignId: string) {
  const safePage = parseCampaignPageParam(String(page));
  const params = new URLSearchParams();

  if (safePage > 1) {
    params.set(CAMPAIGN_PAGE_QUERY_PARAM, String(safePage));
  }
  params.set(CAMPAIGN_SELECTED_QUERY_PARAM, campaignId);

  return `/campaigns?${params.toString()}`;
}
