import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const campaignPage = readFileSync(resolve(root, "app/campaigns/[id]/page.tsx"), "utf8");

test("LinkedIn is required only when the configured channel is available for the lead", () => {
  assert.match(
    campaignPage,
    /function leadSupportsLinkedinAction\(lead: Lead\) \{\s*const capability = lead\.channelCapabilities\?\.linkedin;\s*return Boolean\(\s*leadHasLinkedinProfile\(lead\) &&\s*capability\?\.enabled === true &&\s*capability\.campaignConfigured === true &&\s*capability\.sendable === true\s*\);\s*\}/,
  );
  assert.equal((campaignPage.match(/const needsLinkedin = leadSupportsLinkedinAction\(lead\);/g) || []).length, 1);
  assert.equal(
    (campaignPage.match(/if \(needsLinkedin && !isLeadLinkedinActionHandedOff\(lead\)\) return false;/g) || []).length,
    1,
  );
  assert.match(
    campaignPage,
    /function isLeadLinkedinActionHandedOff\(lead: Lead\) \{\s*return isExecutedOutreachState\(buildOutreachStatus\(lead\)\.linkedin\);\s*\}/,
  );
});

test("legacy approval only carries forward to email", () => {
  assert.match(
    campaignPage,
    /return channel === "email" && lead\.approvalStatus === "approved" \? "approved" : "pending";/,
  );
});

test("LinkedIn is complete only after confirmed sent delivery", () => {
  assert.match(
    campaignPage,
    /function isLeadLinkedinActionCompleted\(lead: Lead\) \{\s*return buildOutreachStatus\(lead\)\.linkedin === "sent";\s*\}/,
  );
  assert.match(
    campaignPage,
    /isLinkedinOutreachCompleted\s*\?\s*"LinkedIn outreach complete"\s*:\s*sendLinkedinDisabledReason \|\| "Queue in HeyReach"/,
  );
});
