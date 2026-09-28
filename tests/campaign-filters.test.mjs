import assert from "node:assert/strict";
import test from "node:test";

import { filterCampaigns, loadAllCampaigns } from "../lib/campaignFilters.ts";

const campaigns = [
  { id: "1", name: "Campaign Alpha", canonicalEventName: "RegTech UAE", date: "2026-11-05", category: "Compliance" },
  { id: "2", name: "Campaign Beta", canonicalEventName: "RegTech KSA", date: "2027-01-20T08:00:00Z", category: "Technology" },
  { id: "3", name: "Legacy Event", date: null, category: null },
];

test("event name, date, and category filters combine across all campaigns", () => {
  const defaults = { eventName: "", date: "", category: "" };
  assert.deepEqual(filterCampaigns(campaigns, defaults).map((item) => item.id), ["1", "2", "3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: " REGTECH " }).map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: "legacy" }).map((item) => item.id), ["3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, date: "2027-01-20" }).map((item) => item.id), ["2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, category: "compliance" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2026-11-05", category: "COMPLIANCE" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2027-01-20", category: "Compliance" }), []);
});

test("loads every backend page before filtering and merges category options", async () => {
  const offsets = [];
  const result = await loadAllCampaigns(async ({ status, limit, offset }) => {
    assert.equal(status, "all");
    assert.equal(limit, 100);
    offsets.push(offset);
    const batch = campaigns.slice(offset, offset + 2);
    return { campaigns: batch, total: campaigns.length, hasMore: offset + batch.length < campaigns.length, categories: offset === 0 ? ["Compliance"] : ["Technology"] };
  });

  assert.deepEqual(offsets, [0, 2]);
  assert.deepEqual(result.campaigns.map((item) => item.id), ["1", "2", "3"]);
  assert.deepEqual(result.categories, ["Compliance", "Technology"]);
});

test("fails rather than showing a partial result if a page is missing", async () => {
  await assert.rejects(
    loadAllCampaigns(async () => ({ campaigns: [], total: 1, hasMore: true })),
    /ended before all campaigns/
  );
});
