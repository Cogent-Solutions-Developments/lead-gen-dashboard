import assert from "node:assert/strict";
import test from "node:test";

import { enrichCampaignMetadata, filterCampaigns, findCampaignCategories, loadAllCampaigns } from "../lib/campaignFilters.ts";

const campaigns = [
  { id: "1", name: "Campaign Alpha", canonicalEventName: "RegTech UAE", date: "2026-11-05", category: "Compliance", createdAt: new Date(2026, 8, 23, 12).toISOString() },
  { id: "2", name: "Campaign Beta", canonicalEventName: "RegTech KSA", date: "2027-01-20T08:00:00Z", category: "Technology", createdAt: new Date(2026, 8, 22, 12).toISOString() },
  { id: "3", name: "Legacy Event", date: null, category: null, createdAt: new Date(2026, 8, 21, 12).toISOString() },
];

test("event name, date, and category filters combine across all campaigns", () => {
  const defaults = { eventName: "", date: "", category: "" };
  assert.deepEqual(filterCampaigns(campaigns, defaults).map((item) => item.id), ["1", "2", "3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: " REGTECH " }).map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: "legacy" }).map((item) => item.id), ["3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: "campaign alpha" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, date: "2027-01-20" }).map((item) => item.id), ["2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, date: "2026-09-23" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, category: "compliance" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2026-11-05", category: "COMPLIANCE" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2027-01-20", category: "Compliance" }), []);
});

test("category search keeps every option available", () => {
  const categories = ["Asset Integrity", "Coatings & Linings", "Corrosion Monitoring", "Fraud Detection", "Test", "Test Event", "Testing", "Testing 2"];
  const manyCategories = Array.from({ length: 63 }, (_, index) => `Category ${index + 1}`);
  assert.deepEqual(findCampaignCategories(categories, "corrosion"), ["Corrosion Monitoring"]);
  assert.deepEqual(findCampaignCategories(categories, "TEST"), ["Test", "Test Event", "Testing", "Testing 2"]);
  assert.deepEqual(findCampaignCategories(categories, ""), categories);
  assert.equal(findCampaignCategories(manyCategories, "").length, 63);
  assert.equal(findCampaignCategories(manyCategories, "").at(-1), "Category 63");
});

test("detail metadata fills missing category and event date before filtering", async () => {
  const cache = new Map();
  const calls = [];
  const getInfo = async (id) => {
    calls.push(id);
    return { info: { category: "Test", date: "2026-07-14", location: "Angola" } };
  };
  const listItem = { id: "legacy", name: "AIMCT Angola", category: null, date: null, createdAt: new Date(2026, 8, 23, 12).toISOString() };
  const first = await enrichCampaignMetadata([listItem], getInfo, cache, 1000);
  assert.deepEqual(calls, ["legacy"]);
  assert.equal(first.campaigns[0].category, "Test");
  assert.equal(first.campaigns[0].date, "2026-07-14");
  assert.deepEqual(filterCampaigns(first.campaigns, { eventName: "angola", date: "2026-09-23", category: "TEST" }).map((item) => item.id), ["legacy"]);
  assert.deepEqual(filterCampaigns(first.campaigns, { eventName: "angola", date: "2026-07-14", category: "TEST" }).map((item) => item.id), ["legacy"]);
  await enrichCampaignMetadata([listItem], getInfo, cache, 1001);
  assert.deepEqual(calls, ["legacy"]);
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
