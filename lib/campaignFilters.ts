import type { CampaignInfo, CampaignListItem, CampaignListResponse } from "./api";

export type CampaignFilters = {
  eventName: string;
  date: string;
  categories: string[];
};

export function findCampaignCategories(categories: string[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return categories.filter((category) => category.toLocaleLowerCase().includes(search));
}

const CAMPAIGN_BATCH_SIZE = 100;
const METADATA_BATCH_SIZE = 8;
const METADATA_CACHE_MS = 5 * 60 * 1000;

export type CampaignInfoCache = Map<string, { info: CampaignInfo | null; fetchedAt: number }>;

function hasExplicitTimezone(value: string) {
  return /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
}

function timezoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcFromTz = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  );
  return utcFromTz - date.getTime();
}

export function parseDbTimestamp(value: string) {
  if (!value) return null;
  if (hasExplicitTimezone(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = value.replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day, hour, minute, second = "0", msRaw = "0"] = match;
  const ms = Number(msRaw.padEnd(3, "0").slice(0, 3));
  const guessUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), ms);
  // Timestamps without a timezone are stored as Germany local time.
  let offset = timezoneOffsetMs(new Date(guessUtc), "Europe/Berlin");
  let utc = guessUtc - offset;
  offset = timezoneOffsetMs(new Date(utc), "Europe/Berlin");
  utc = guessUtc - offset;
  return new Date(utc);
}

function localDateKey(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterCampaigns(campaigns: CampaignListItem[], filters: CampaignFilters) {
  const eventName = filters.eventName.trim().toLocaleLowerCase();
  const categories = new Set(filters.categories.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean));

  return campaigns.filter((campaign) => {
    if (eventName) {
      const names = [campaign.canonicalEventName, campaign.name]
        .map((value) => String(value || "").toLocaleLowerCase());
      if (!names.some((name) => name.includes(eventName))) return false;
    }

    if (categories.size > 0) {
      const campaignCategory = String(campaign.category || "").trim().toLocaleLowerCase();
      if (!categories.has(campaignCategory)) return false;
    }

    if (filters.date) {
      const campaignDate = String(campaign.date || "").trim().slice(0, 10);
      if (campaignDate !== filters.date && localDateKey(parseDbTimestamp(campaign.createdAt)) !== filters.date) {
        return false;
      }
    }

    return true;
  });
}

export async function enrichCampaignMetadata(
  campaigns: CampaignListItem[],
  getInfo: (id: string) => Promise<{ info: CampaignInfo | null }>,
  cache: CampaignInfoCache,
  now = Date.now(),
  onBatch?: (infoById: Record<string, CampaignInfo | null>) => void
) {
  const needsInfo = campaigns.filter((campaign) => {
    if (campaign.category && campaign.date) return false;
    const cached = cache.get(campaign.id);
    return !cached || now - cached.fetchedAt >= METADATA_CACHE_MS;
  });
  const failedIds: string[] = [];

  for (let index = 0; index < needsInfo.length; index += METADATA_BATCH_SIZE) {
    const batchInfoById: Record<string, CampaignInfo | null> = {};
    await Promise.all(needsInfo.slice(index, index + METADATA_BATCH_SIZE).map(async (campaign) => {
      try {
        const response = await getInfo(campaign.id);
        cache.set(campaign.id, { info: response.info || null, fetchedAt: now });
        batchInfoById[campaign.id] = response.info || null;
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          cache.set(campaign.id, { info: null, fetchedAt: now });
          batchInfoById[campaign.id] = null;
        } else {
          failedIds.push(campaign.id);
        }
      }
    }));
    if (Object.keys(batchInfoById).length > 0) onBatch?.(batchInfoById);
  }

  const infoById: Record<string, CampaignInfo | null> = {};
  const enriched = campaigns.map((campaign) => {
    const cached = cache.get(campaign.id);
    if (!cached) return campaign;
    infoById[campaign.id] = cached.info;
    return {
      ...campaign,
      category: campaign.category || cached.info?.category || null,
      date: campaign.date || cached.info?.date || null,
      location: campaign.location || cached.info?.location || null,
    };
  });

  return { campaigns: enriched, infoById, failedIds };
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
