import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMPAIGN_PAGE_CACHE_MS, invalidateCampaignPages, invalidateCampaignPagesAfterMutation,
  loadCampaignPage, readCampaignPage,
} from "../lib/campaignPageCache.ts";

const params = { status: "all", limit: 4, offset: 0, categories: [], includeCategories: true };
const page = { campaigns: [{ id: "first" }], total: 250, hasMore: true, categories: ["Compliance"] };

test("loads only the requested page and reuses it until stale", async () => {
  invalidateCampaignPages();
  const calls = [];
  const loader = async (query) => { calls.push(query); return page; };
  const started = Date.now();
  assert.equal(await loadCampaignPage("sales:user-1", params, loader), page);
  await loadCampaignPage("sales:user-1", params, loader, false, started + 100);
  assert.deepEqual(calls, [params]);
  await loadCampaignPage("sales:user-1", params, loader, false, started + CAMPAIGN_PAGE_CACHE_MS + 100);
  assert.equal(calls.length, 2);
});

test("cache separates users, departments, filters, dates and page sizes", async () => {
  invalidateCampaignPages();
  let calls = 0;
  const loader = async () => { calls++; return page; };
  await loadCampaignPage("sales:user-1", params, loader);
  for (const [scope, query] of [
    ["sales:user-2", params], ["production:user-1", params],
    ["sales:user-1", { ...params, offset: 4 }],
    ["sales:user-1", { ...params, search: "Angola" }],
    ["sales:user-1", { ...params, categories: ["Compliance"] }],
    ["sales:user-1", { ...params, date: "2026-11-18" }],
    ["sales:user-1", { ...params, limit: 8 }],
  ]) await loadCampaignPage(scope, query, loader);
  assert.equal(calls, 8);
  await loadCampaignPage("sales:user-1", { ...params, search: " ANGOLA " }, loader);
  assert.equal(calls, 8);
});

test("concurrent requests share one fetch, including Strict Mode remounts", async () => {
  invalidateCampaignPages();
  let finish;
  let calls = 0;
  const loader = () => { calls++; return new Promise((resolve) => { finish = resolve; }); };
  const first = loadCampaignPage("sales:user-1", params, loader);
  const second = loadCampaignPage("sales:user-1", params, loader);
  finish(page);
  assert.deepEqual(await Promise.all([first, second]), [page, page]);
  assert.equal(calls, 1);
});

test("mutations invalidate pages and old requests cannot repopulate them", async () => {
  invalidateCampaignPages();
  let finish;
  const old = loadCampaignPage("sales:user-1", params, () => new Promise((resolve) => { finish = resolve; }));
  const response = { config: { method: "delete" } };
  assert.equal(invalidateCampaignPagesAfterMutation(response), response);
  const updated = { ...page, total: 249 };
  await loadCampaignPage("sales:user-1", params, async () => updated);
  finish(page);
  await old;
  assert.equal(readCampaignPage("sales:user-1", params), updated);
  invalidateCampaignPagesAfterMutation({ config: { method: "get" } });
  assert.equal(readCampaignPage("sales:user-1", params), updated);
});

test("failed fetches can retry and explicit refresh bypasses fresh pages", async () => {
  invalidateCampaignPages();
  await assert.rejects(loadCampaignPage("sales:user-1", params, async () => { throw new Error("offline"); }), /offline/);
  assert.equal(await loadCampaignPage("sales:user-1", params, async () => page), page);
  const updated = { ...page, total: 251 };
  assert.equal(await loadCampaignPage("sales:user-1", params, async () => updated, true), updated);
});
