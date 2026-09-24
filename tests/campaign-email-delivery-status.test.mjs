import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const campaignPage = readFileSync(
  new URL("../app/campaigns/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("approved campaign leads replace approval copy with dated email delivery status", () => {
  assert.match(campaignPage, /emailDelivery\?: EmailDelivery/);
  assert.match(campaignPage, /emailDelivery: normalizeEmailDelivery\(x\.emailDelivery\)/);
  assert.match(campaignPage, /item\.approvalStatus === "approved" && canSendEmail[\s\S]*getLeadMailStatus\(item\)/);
  assert.match(campaignPage, /label: "Initial sent"/);
  assert.match(campaignPage, /`Sent \$\{formatDateTime\(lead\.emailDelivery\.initialSentAt\)\}`/);
  assert.match(campaignPage, /label: "Ready to send", subtitle: "Content approved"/);
  assert.match(campaignPage, /\{mailStatus\.subtitle\}/);
});

test("follow-up status timeline shows confirmed send dates", () => {
  assert.match(campaignPage, /formatTimelineDateTime\(followUpTargetLead\.emailDelivery\.initialSentAt\)/);
  assert.match(campaignPage, /formatTimelineDateTime\(historyItem\.sentAt\)/);
  assert.match(campaignPage, /emailDelivery: mergeFollowUpHistory\(lead, history\)/);
  assert.match(campaignPage, /emailDelivery: normalizeEmailDelivery\(latest\.emailDelivery\)/);
});

test("sent initial email stays green while sent follow-ups use purple", () => {
  assert.match(campaignPage, /sent: \{ bg: "border-emerald-200 bg-emerald-50 text-emerald-700"/);
  assert.match(campaignPage, /followUpSent: \{ bg: "border-violet-200 bg-violet-50 text-violet-700"/);
  assert.match(campaignPage, /latestFollowUp\.status === "sent"\s*\? mailDeliveryStyles\.followUpSent/);
  assert.match(campaignPage, /\.\.\.mailDeliveryStyles\.sent,\s*label: "Initial sent"/);
});
