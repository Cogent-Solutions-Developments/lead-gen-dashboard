import assert from "node:assert/strict";
import test from "node:test";

import { buildCampaignFilterParams, enrichCampaignMetadata, filterCampaigns, findCampaignCategories } from "../lib/campaignFilters.ts";

const campaigns = [
  { id: "1", name: "Campaign Alpha", canonicalEventName: "RegTech UAE", date: "2026-11-05", category: "Compliance", createdAt: new Date(2026, 8, 23, 12).toISOString() },
  { id: "2", name: "Campaign Beta", canonicalEventName: "RegTech KSA", date: "2027-01-20T08:00:00Z", category: "Technology", createdAt: new Date(2026, 8, 22, 12).toISOString() },
  { id: "3", name: "Legacy Event", date: null, category: null, createdAt: new Date(2026, 8, 21, 12).toISOString() },
];

test("event name, date, and category filters combine across all campaigns", () => {
  const defaults = { eventName: "", date: "", categories: [] };
  assert.deepEqual(filterCampaigns(campaigns, defaults).map((item) => item.id), ["1", "2", "3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: " REGTECH " }).map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: "legacy" }).map((item) => item.id), ["3"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, eventName: "campaign alpha" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, date: "2027-01-20" }).map((item) => item.id), ["2"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, date: "2026-09-23" }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, categories: ["compliance"] }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { ...defaults, categories: ["compliance", "TECHNOLOGY"] }).map((item) => item.id), ["1", "2"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2026-11-05", categories: ["COMPLIANCE", "Technology"] }).map((item) => item.id), ["1"]);
  assert.deepEqual(filterCampaigns(campaigns, { eventName: "regtech", date: "2027-01-20", categories: ["Compliance"] }), []);
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
  assert.deepEqual(filterCampaigns(first.campaigns, { eventName: "angola", date: "2026-09-23", categories: ["TEST"] }).map((item) => item.id), ["legacy"]);
  assert.deepEqual(filterCampaigns(first.campaigns, { eventName: "angola", date: "2026-07-14", categories: ["TEST"] }).map((item) => item.id), ["legacy"]);
  await enrichCampaignMetadata([listItem], getInfo, cache, 1001);
  assert.deepEqual(calls, ["legacy"]);
});

test("metadata is published a batch at a time while later requests are pending", async () => {
  const items = Array.from({ length: 9 }, (_, index) => ({
    id: String(index), name: `Campaign ${index}`, category: null, date: null,
  }));
  let resolveLast;
  const lastRequest = new Promise((resolve) => { resolveLast = resolve; });
  const published = [];
  const enrichment = enrichCampaignMetadata(
    items,
    async (id) => id === "8" ? lastRequest : { info: { category: `Category ${id}`, date: "2026-09-23" } },
    new Map(),
    1000,
    (batch) => published.push(batch)
  );

  for (let attempt = 0; attempt < 10 && published.length === 0; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(published.length, 1);
  assert.equal(Object.keys(published[0]).length, 8);

  resolveLast({ info: { category: "Category 8", date: "2026-09-23" } });
  const result = await enrichment;
  assert.equal(published.length, 2);
  assert.equal(result.campaigns[8].category, "Category 8");
});


test("compact filters recognize a year without requiring it in the event name", () => {
  const filters = { eventName: "  Expo   2027  ", date: "", categories: [] };
  assert.deepEqual(buildCampaignFilterParams(filters), {
    search: "Expo", eventYear: 2027, eventDateFrom: undefined, eventDateTo: undefined,
  });
  assert.equal(buildCampaignFilterParams({ ...filters, eventName: "2027" }).search, undefined);
  assert.equal(buildCampaignFilterParams({ ...filters, eventName: "2027" }).eventYear, 2027);
  assert.equal(buildCampaignFilterParams({ ...filters, eventName: "ISO 27001 Expo" }).eventYear, undefined);
  assert.equal(buildCampaignFilterParams({ ...filters, eventName: "Expo 2027 2028" }).eventYear, undefined);
  assert.equal(buildCampaignFilterParams({ ...filters, eventName: "Expo 2027 2028" }).search, "Expo 2027 2028");
  assert.equal(buildCampaignFilterParams({ ...filters, eventYear: "2028" }).eventYear, 2028);
});

test("the compact date control uses an exact event date and combines with year and name", () => {
  assert.deepEqual(buildCampaignFilterParams({ eventName: "Expo", eventYear: "2027", date: "2027-05-10", categories: [] }), {
    search: "Expo", eventYear: 2027, eventDateFrom: "2027-05-10", eventDateTo: "2027-05-10",
  });
  assert.deepEqual(buildCampaignFilterParams({ eventName: "", date: "", categories: [] }), {
    search: undefined, eventYear: undefined, eventDateFrom: undefined, eventDateTo: undefined,
  });
});
