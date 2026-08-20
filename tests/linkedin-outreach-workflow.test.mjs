import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const campaignPage = readFileSync(resolve(root, "app/campaigns/[id]/page.tsx"), "utf8");

test("LinkedIn remains required until its outreach handoff has been queued", () => {
  assert.equal((campaignPage.match(/const needsLinkedin = leadHasLinkedinProfile\(lead\);/g) || []).length, 2);
  assert.equal(
    (campaignPage.match(/if \(needsLinkedin && !isLeadLinkedinActionHandedOff\(lead\)\) return false;/g) || []).length,
    2,
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
