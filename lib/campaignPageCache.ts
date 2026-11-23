import type { CampaignListParams, CampaignListResponse } from "./api";

export const CAMPAIGN_PAGE_CACHE_MS = 60_000;
const MAX_PAGES = 50;
const pages = new Map<string, { data: CampaignListResponse; fetchedAt: number }>();
const pending = new Map<string, Promise<CampaignListResponse>>();
let revision = 0;

function pageKey(scope: string, params: CampaignListParams) {
  return JSON.stringify([scope, {
    ...params,
    search: params.search?.trim().toLowerCase() || "",
    categories: [...new Set(params.categories?.map((value) => value.trim().toLowerCase()))].sort(),
  }]);
}

export function invalidateCampaignPages() {
  revision += 1;
  pages.clear();
  pending.clear();
}

export function readCampaignPage(scope: string, params: CampaignListParams) {
  return pages.get(pageKey(scope, params))?.data;
}

export function invalidateCampaignPagesAfterMutation<T extends { config: { method?: string } }>(response: T): T {
  const method = response.config.method?.toLowerCase() || "get";
  if (!["get", "head", "options"].includes(method)) invalidateCampaignPages();
  return response;
}

export async function loadCampaignPage(
  scope: string,
  params: CampaignListParams,
  loader: (params: CampaignListParams) => Promise<CampaignListResponse>,
  force = false,
  now = Date.now()
) {
  const key = pageKey(scope, params);
  const cached = pages.get(key);
  if (!force && cached && now - cached.fetchedAt < CAMPAIGN_PAGE_CACHE_MS) return cached.data;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const requestRevision = revision;
  const request = loader(params).then((data) => {
    if (requestRevision === revision) {
      pages.delete(key);
      pages.set(key, { data, fetchedAt: Date.now() });
      if (pages.size > MAX_PAGES) pages.delete(pages.keys().next().value!);
    }
    return data;
  });
  pending.set(key, request);
  try {
    return await request;
  } finally {
    if (pending.get(key) === request) pending.delete(key);
  }
}
