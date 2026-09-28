import type { CampaignListItem, CampaignListResponse } from "./api";

export type CampaignFilters = {
  eventName: string;
  date: string;
  category: string;
};

const CAMPAIGN_BATCH_SIZE = 100;

export function filterCampaigns(campaigns: CampaignListItem[], filters: CampaignFilters) {
  const eventName = filters.eventName.trim().toLocaleLowerCase();
  const category = filters.category.trim().toLocaleLowerCase();

  return campaigns.filter((campaign) => {
    const name = String(campaign.canonicalEventName || campaign.name || "").toLocaleLowerCase();
    const campaignDate = String(campaign.date || "").trim().slice(0, 10);
    const campaignCategory = String(campaign.category || "").trim().toLocaleLowerCase();

    return (
      (!eventName || name.includes(eventName)) &&
      (!filters.date || campaignDate === filters.date) &&
      (!category || campaignCategory === category)
    );
  });
}

export async function loadAllCampaigns(
  list: (params: { status: string; limit: number; offset: number }) => Promise<CampaignListResponse>
) {
  const campaigns: CampaignListItem[] = [];
  const categories = new Set<string>();
  let offset = 0;

  while (true) {
    const response = await list({ status: "all", limit: CAMPAIGN_BATCH_SIZE, offset });
    const batch = response.campaigns || [];
    for (const campaign of batch) campaigns.push(campaign);
    for (const category of response.categories || []) {
      if (category.trim()) categories.add(category.trim());
    }

    if (batch.length === 0) {
      if (offset < Number(response.total || 0)) {
        throw new Error("The campaign list ended before all campaigns were loaded.");
      }
      break;
    }

    offset += batch.length;
    if (response.hasMore === false && offset < Number(response.total || 0)) {
      throw new Error("The campaign list ended before all campaigns were loaded.");
    }
    if (offset >= Number(response.total || 0) && response.hasMore !== true) break;
  }

  return { campaigns, categories: [...categories] };
}
