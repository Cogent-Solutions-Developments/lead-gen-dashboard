import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCampaignDetailHref,
  buildCampaignListReturnHref,
  didCampaignFiltersChange,
  parseCampaignPageParam,
} from "../lib/campaignNavigation.ts";

const campaignListSource = readFileSync(
  new URL("../app/campaigns/page.tsx", import.meta.url),
  "utf8"
);

test("campaign detail links preserve the originating campaign page", () => {
  assert.equal(buildCampaignDetailHref("campaign-123", 5), "/campaigns/campaign-123?fromPage=5");
  assert.equal(buildCampaignDetailHref("campaign-123", 1), "/campaigns/campaign-123");
});

test("campaign return links restore the page and identify the selected campaign", () => {
  assert.equal(
    buildCampaignListReturnHref(5, "campaign-123"),
    "/campaigns?page=5&selected=campaign-123"
  );
  assert.equal(buildCampaignListReturnHref(1, "campaign-123"), "/campaigns?selected=campaign-123");
});

test("campaign page parameters are constrained to positive whole pages", () => {
  assert.equal(parseCampaignPageParam("5.8"), 5);
  assert.equal(parseCampaignPageParam("0"), 1);
  assert.equal(parseCampaignPageParam("not-a-page"), 1);
});

test("campaign pagination survives initial and Strict Mode filter effects", () => {
  const filters = { eventName: "", date: "", categories: [] };

  assert.equal(didCampaignFiltersChange(null, filters), false);
  assert.equal(didCampaignFiltersChange(filters, { ...filters }), false);
  assert.equal(didCampaignFiltersChange(filters, { ...filters, eventName: "Angola" }), true);
  assert.equal(didCampaignFiltersChange(filters, { ...filters, date: "2027-01-20" }), true);
  assert.equal(didCampaignFiltersChange(filters, { ...filters, categories: ["Compliance"] }), true);
  assert.equal(didCampaignFiltersChange({ ...filters, categories: ["Compliance", "Technology"] }, { ...filters, categories: ["Technology", "Compliance"] }), false);
  assert.equal(didCampaignFiltersChange({ ...filters, categories: ["Compliance", "Technology"] }, { ...filters, categories: ["Technology"] }), true);
  assert.doesNotMatch(campaignListSource, /didMountFilterResetRef/);
  assert.match(
    campaignListSource,
    /if \(didCampaignFiltersChange\(previousFilters, nextFilters\)\) \{\s*replaceCampaignPage\(1\);/
  );
});

test("selected campaign highlight is immediate and dark-mode safe", () => {
  assert.match(campaignListSource, /initial=\{isSelectedCampaign \? false : \{ opacity: 0, y: 8 \}\}/);
  assert.match(campaignListSource, /delay: isSelectedCampaign \? 0 : index \* 0\.04/);
  assert.match(campaignListSource, /dark:bg-blue-950\/45/);
  assert.match(campaignListSource, /dark:shadow-\[inset_4px_0_0_#60a5fa/);
  assert.match(campaignListSource, /dark:bg-blue-950\/90 dark:text-blue-200/);
});

test("campaign filter panel offers event name, event date, and category without status choices", () => {
  assert.match(campaignListSource, /Search event name/);
  assert.match(campaignListSource, /id="campaign-date-filter"/);
  assert.match(campaignListSource, /id="campaign-category-search"/);
  assert.match(campaignListSource, /role="combobox"/);
  assert.match(campaignListSource, /role="listbox"/);
  assert.match(campaignListSource, /max-h-44 overflow-y-auto/);
  assert.match(campaignListSource, /aria-multiselectable="true"/);
  assert.match(campaignListSource, /aria-pressed=\{selectedCategories\.length === 0\}/);
  assert.doesNotMatch(campaignListSource, /setStatusFilter|All statuses/);
});
