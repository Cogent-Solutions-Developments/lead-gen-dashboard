import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("settings links to a dedicated content generation control center", () => {
  const settings = read("app/settings/page.tsx");
  const contentGenerationPage = read("app/settings/content-generation/page.tsx");

  assert.match(settings, /href="\/settings\/content-generation"/);
  assert.match(settings, /title="Content Generation"/);
  assert.doesNotMatch(settings, /<ContentGenerationControlCenter\s*\/>/);
  assert.match(contentGenerationPage, /<ContentGenerationControlCenter\s*\/>/);
  assert.doesNotMatch(contentGenerationPage, /aria-label="Breadcrumb"/);
  assert.match(contentGenerationPage, /href="\/settings"/);
  assert.doesNotMatch(settings, />Profile</);
  assert.doesNotMatch(settings, />API Keys</);
  assert.doesNotMatch(settings, /sk-\.\.\.|bf-\.\.\./);
  assert.doesNotMatch(settings, /handleSave|Save Changes/);
});

test("content generation settings use authenticated admin configuration and overview APIs", () => {
  const api = read("lib/contentGenerationAdmin.ts");

  assert.match(api, /getAuthHeader\(\)/);
  assert.match(api, /cache: "no-store"/);
  assert.match(api, /\/api\/admin\/content-generation\/configuration/);
  assert.match(api, /method: "PUT"/);
  assert.match(api, /\/api\/admin\/content-generation\/overview/);
  assert.match(api, /\/api\/admin\/content-generation\/runs\/\$\{encodeURIComponent\(jobId\)\}/);
  assert.match(api, /expectedVersion: number/);
});

test("control center exposes durable limits, visual tracking, and recovery states without status chips", () => {
  const center = read("components/settings/ContentGenerationControlCenter.tsx");

  assert.match(center, />Control Center</);
  assert.doesNotMatch(center, /DB managed/);
  assert.match(center, /Promise\.allSettled/);
  assert.match(center, /setInterval\(\(\) => void load\(true\), 30000\)/);
  assert.match(center, /status\?: number[\s\S]*?=== 409\) await load\(true\)/);
  assert.match(center, /expectedVersion: draftBase.version/);
  assert.match(center, /configurationChanged/);
  assert.match(center, /Save guardrails/);
  assert.match(center, />Spend & usage</);
  assert.match(center, />Outcomes</);
  assert.match(center, />Stage flow</);
  assert.match(center, /Atomic checkpoint ledger/);
  assert.match(center, /Atomic recovery/);
  assert.match(center, /Campaign batch queue/);
  assert.match(center, /Batch execution plan/);
  assert.match(center, /Cost budget used/);
  assert.match(center, />Recent runs</);
  assert.match(center, /Recent configuration changes/);
  assert.match(center, /maxLeadsPerRun[\s\S]*?max: 1000/);
  assert.match(center, /maxCampaignLeads[\s\S]*?max: 100000/);
  assert.match(center, /maxRequestsPerLead[\s\S]*?max: 25/);
  assert.match(center, /maxTotalTokensPerRun[\s\S]*?max: 20000000/);
  assert.match(center, /maxCostPerLeadUsd[\s\S]*?max: 1/);
  assert.match(center, /maxCampaignCostUsd[\s\S]*?max: 10000/);
  assert.match(center, /validatorModel/);
  assert.match(center, /writerModel/);
  assert.match(center, /qaModel/);
  assert.match(center, /promptCacheEnabled/);
});

test("campaign generation feedback reports the durable backend batch plan", () => {
  const api = read("lib/api.ts");
  const campaigns = read("app/campaigns/page.tsx");
  const campaign = read("app/campaigns/[id]/page.tsx");

  assert.match(api, /batchSize\?: number/);
  assert.match(api, /totalBatches\?: number/);
  assert.match(campaigns, /durable batch/);
  assert.match(campaign, /durable batch/);
  assert.doesNotMatch(campaigns, /one sequential content worker/);
});
