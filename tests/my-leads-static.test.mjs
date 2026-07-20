import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("normal users see a dedicated My Leads navigation item", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.match(
    sidebar,
    /\{\s*name:\s*"My Leads",\s*href:\s*"\/my-leads",[\s\S]*?normalOnly:\s*true\s*\}/
  );
});

test("shared LeadSheet hides create actions while My Leads enables them", () => {
  const leadSheet = read("components/leads/NormalUserEventLeadSheet.tsx");
  assert.match(leadSheet, /type LeadSheetDataMode = "shared" \| "my-leads"/);
  assert.match(leadSheet, /const canUseTemplateUpload = isMyLeadsMode && isPipelineUserRole;/);
  assert.match(leadSheet, /const canUseManualLeadAdd = isMyLeadsMode && isPipelineUserRole;/);
  assert.match(leadSheet, /addMyLeadsEventLead\(canonicalEventKey, payload, effectivePersona\)/);
});

test("My Leads endpoints resolve to the correct pipeline prefixes", () => {
  const apiRouter = read("lib/apiRouter.ts");
  assert.match(apiRouter, /return "\/api\/delegates\/my-leads";/);
  assert.match(apiRouter, /return "\/api\/productions\/my-leads";/);
  assert.match(apiRouter, /return "\/api\/my-leads";/);
  assert.match(apiRouter, /export async function createMyLeadsCampaignFromUpload/);
  assert.match(apiRouter, /export async function addMyLeadsEventLead/);
  assert.match(apiRouter, /`\$\{getMyLeadsPrefix\(persona\)\}\/events\/\$\{encodeURIComponent\(canonicalEventKey\)\}\/leads`/);
  assert.match(apiRouter, /export async function listMyLeadsEventLeads/);
  assert.match(apiRouter, /export async function downloadMyLeadsCampaignExport/);
});

test("normal upload entry points route to My Leads upload", () => {
  const uploadPage = read("app/campaigns/upload/page.tsx");
  const quickActions = read("components/dashboard/QuickActions.tsx");
  assert.match(uploadPage, /router\.replace\("\/my-leads\?upload=1"\)/);
  assert.match(quickActions, /normalHref:\s*"\/my-leads\?upload=1"/);
});

test("My Leads page enforces role persona and redirects admins", () => {
  const page = read("app/my-leads/page.tsx");
  assert.match(page, /router\.replace\("\/leads"\)/);
  assert.match(page, /const expectedPersona = personaForRole\(role\)/);
  assert.match(page, /if \(hasPersonaMismatch\) router\.replace\("\/dashboard"\)/);
});
