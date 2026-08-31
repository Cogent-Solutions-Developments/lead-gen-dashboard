import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

test("campaign message approval is delegated to the shared content-aware resolver", () => {
  assert.match(
    campaignPage,
    /return resolveCampaignMessageApproval\(lead, channel\);/,
  );
});

test("generated and manually saved channel content is ready without template auto-approval", async () => {
  const { hasCampaignMessageContent, resolveCampaignMessageApproval } = await import(
    pathToFileURL(resolve(root, "lib/campaignMessageApproval.ts")).href
  );

  for (const contentSource of ["generated", "manual", "unknown", undefined]) {
    assert.equal(
      resolveCampaignMessageApproval(
        {
          approvalStatus: "pending",
          channelApprovals: { email: "pending" },
          contentSource,
          contentEmail: "A personalized message",
        },
        "email",
      ),
      "approved",
    );
    assert.equal(
      resolveCampaignMessageApproval(
        {
          approvalStatus: "pending",
          channelApprovals: { linkedin: "pending" },
          contentSource,
          contentLinkedin: "A personalized LinkedIn message",
        },
        "linkedin",
      ),
      "approved",
    );
  }

  assert.equal(hasCampaignMessageContent({ contentEmail: "A personalized message" }, "email"), true);
  assert.equal(hasCampaignMessageContent({ contentLinkedin: "   " }, "linkedin"), false);
});

test("content-aware approval keeps production safety gates intact", async () => {
  const { resolveCampaignMessageApproval } = await import(
    pathToFileURL(resolve(root, "lib/campaignMessageApproval.ts")).href
  );

  assert.equal(
    resolveCampaignMessageApproval(
      {
        channelApprovals: { email: "rejected" },
        contentSource: "generated",
        contentEmail: "Do not send this",
      },
      "email",
    ),
    "rejected",
  );
  assert.equal(
    resolveCampaignMessageApproval(
      { channelApprovals: { email: "pending" }, contentSource: "generated", contentEmail: "   " },
      "email",
    ),
    "pending",
  );
  assert.equal(
    resolveCampaignMessageApproval(
      { approvalStatus: "approved" },
      "email",
    ),
    "approved",
  );
  assert.equal(
    resolveCampaignMessageApproval(
      { approvalStatus: "approved" },
      "linkedin",
    ),
    "pending",
  );
});

test("row actions use real content to bypass stale approval capability flags", () => {
  assert.match(
    campaignPage,
    /capability\.sendable === false && !hasCampaignMessageContent\(lead, "email"\)/,
  );
  assert.match(
    campaignPage,
    /capability\.sendable === false && !hasCampaignMessageContent\(lead, "linkedin"\)/,
  );
  assert.match(
    campaignPage,
    /const disabledReason = getLeadSendActionDisabledReason\(lead, action\);/,
  );
  assert.doesNotMatch(
    campaignPage,
    /action === "email" \|\| action === "linkedin" \? null : getLeadSendActionDisabledReason/,
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
