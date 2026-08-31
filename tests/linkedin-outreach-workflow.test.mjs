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
  const { resolveCampaignMessageApproval } = await import(
    pathToFileURL(resolve(root, "lib/campaignMessageApproval.ts")).href
  );

  for (const contentSource of ["generated", "manual"]) {
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
      { approvalStatus: "approved", contentSource: "unknown" },
      "email",
    ),
    "approved",
  );
  assert.equal(
    resolveCampaignMessageApproval(
      { approvalStatus: "approved", contentSource: "unknown" },
      "linkedin",
    ),
    "pending",
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
