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
  assert.match(sidebar, /name:\s*"CS Database",\s*normalLabel:\s*"CS Database",\s*href:\s*"\/leads"/);
});

test("every lead view shows verified data origins", () => {
  const sharedLeads = read("components/leads/NormalUserEventLeadSheet.tsx");
  const database = read("app/leads/page.tsx");
  const myLeads = read("app/my-leads/page.tsx");
  const teamLeads = read("app/team-leads/page.tsx");
  const originTag = read("components/leads/LeadOriginTag.tsx");

  assert.match(originTag, /originSources\?: LeadOriginSource\[\]/);
  assert.match(originTag, /const labels = getLeadOriginLabels\(\{ originSources \}\)/);
  assert.match(originTag, /return providedLabel \|\| \(owner \? `\$\{owner\}'s \$\{LEADS_LABEL\}` : ""\)/);
  assert.match(sharedLeads, /<LeadOriginTags originSources=\{item\.originSources\}/);
  assert.match(database, /<LeadOriginTags originSources=\{item\.originSources\}/);
  assert.doesNotMatch(database, /Nizo Finder/);
  assert.match(myLeads, /<LeadOriginTags originSources=\{item\.originSources\}/);
  assert.match(teamLeads, /originLabel=\{`\$\{memberName\(selectedMember\)\}'s Leads`\}/);
});

test("shared LeadSheet hides create actions while My Leads enables them", () => {
  const leadSheet = read("components/leads/NormalUserEventLeadSheet.tsx");
  assert.match(leadSheet, /type LeadSheetDataMode = "shared" \| "my-leads"/);
  assert.match(leadSheet, /const canUseTemplateUpload = isMyLeadsMode && isPipelineUserRole;/);
  assert.match(leadSheet, /const canUseManualLeadAdd = isMyLeadsMode && isPipelineUserRole;/);
  assert.match(leadSheet, /addMyLeadsEventLead\(canonicalEventKey, payload, effectivePersona\)/);
});

test("shared CS Database only scopes by an explicitly selected lead group", () => {
  const leadSheet = read("components/leads/NormalUserEventLeadSheet.tsx");

  assert.match(
    leadSheet,
    /listEventsForPersona\(effectivePersona, leadGroup \? \{ leadGroup \} : undefined\)/
  );
  assert.match(leadSheet, /leadGroup: isMyLeadsMode \? undefined : leadGroup/);
  assert.doesNotMatch(
    leadSheet,
    /listEventsForPersona\(effectivePersona, \{ leadGroup: effectiveLeadGroup \}\)/
  );
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
  assert.match(apiRouter, /export async function updateMyLead/);
  assert.match(apiRouter, /apiClient\.patch<sales\.MyLeadUpdateResponse>/);
  assert.match(apiRouter, /`\$\{getMyLeadsPrefix\(persona\)\}\/leads\/\$\{encodeURIComponent\(id\)\}`/);
});

test("My Leads edit is capability gated and never exposes delete", () => {
  const page = read("app/my-leads/page.tsx");
  const editForm = read("components/leads/MyLeadEditForm.tsx");

  assert.match(page, /item\.canEdit \? \(/);
  assert.match(page, /setEditingLeadId\(item\.id\)/);
  assert.match(page, /<MyLeadEditForm/);
  assert.match(editForm, /expectedVersion: lead\.leadEditVersion/);
  assert.match(editForm, /Deletion is intentionally unavailable/);
  assert.doesNotMatch(page, /deleteMyLead|deleteUploadedLead/);
});

test("My Leads add and edit forms support a second mobile number", () => {
  const page = read("app/my-leads/page.tsx");
  const editForm = read("components/leads/MyLeadEditForm.tsx");
  const api = read("lib/api.ts");

  assert.match(page, /phone2: addLeadForm\.phone2\.trim\(\)/);
  assert.match(page, /Mobile Number 2/);
  assert.match(editForm, /payload\.phone2 = cleaned\.phone2/);
  assert.match(editForm, /Mobile number 2/);
  assert.match(api, /phone2\?: string/);
});

test("Source timeline renders append-only lead edit records", () => {
  const originHistory = read("components/leads/LeadOriginTag.tsx");
  const api = read("lib/api.ts");

  assert.match(api, /eventType\?: "lead_source_recorded" \| "lead_profile_updated" \| string/);
  assert.match(api, /changedFields\?: string\[\]/);
  assert.match(api, /fieldChanges\?: Array/);
  assert.match(originHistory, /Lead profile updated/);
  assert.match(originHistory, /Edited by \$\{actor\}/);
  assert.doesNotMatch(originHistory, />Version \{entry\.editVersion\}</);
  assert.match(originHistory, /\[\{change\.label\}\]/);
  assert.match(originHistory, /\{oldValue\}/);
  assert.match(originHistory, /\{newValue\}/);
  assert.match(originHistory, /EDIT_FIELD_LABELS/);
  assert.match(originHistory, /phone2: "Mobile number 2"/);
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

test("lead requests accept designation lists with concise copy", () => {
  const dialog = read("components/leads/LeadRequestDialog.tsx");

  assert.match(dialog, /<Textarea value=\{form\.targetDesignation\}/);
  assert.match(dialog, />Designations<\/span>/);
  assert.match(dialog, /placeholder="One per line or comma"/);
  assert.doesNotMatch(dialog, /Target designation|Tell the admin team|Send request/);
});
