import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { generationStatus, generationLeadSnapshot } from "../lib/contentGenerationState.ts";
import { hasLeadContentEdits, isCampaignLeadSelectionBlocked, leadSendabilityReason } from "../lib/campaignLeadReadiness.ts";

const source = readFileSync(new URL("../app/campaigns/[id]/page.tsx", import.meta.url), "utf8");

test("unfinished leads can be selected for generation while suppression remains enforced", () => {
  assert.equal(isCampaignLeadSelectionBlocked({}), false);
  for (const lead of [{ contactReadOnly: true }, { approvalStatus: "suppressed" }, { isSuppressed: true }, { suppression: { active: true } }]) {
    assert.equal(isCampaignLeadSelectionBlocked(lead), true);
  }
  assert.equal(isCampaignLeadSelectionBlocked({}, true), true);
  const selectAll = source.slice(source.indexOf("const selectableFilteredLeads"), source.indexOf("const leadById"));
  assert.doesNotMatch(selectAll, /sendable/);
  for (const name of ["selectedEmailSendLeads", "selectedWhatsappSendLeads"]) {
    assert.match(source.slice(source.indexOf(`const ${name}`), source.indexOf(`const ${name}`) + 1200), /lead.sendable === false/);
  }
});

test("blocked lead guidance distinguishes quality failures, missing content and missing contact details", () => {
  assert.match(leadSendabilityReason({ email: "lead@example.com", contentEmail: "Body" }), /both a subject and body/);
  assert.match(leadSendabilityReason({}), /no outreach contact/);
  assert.match(leadSendabilityReason({ generationFailure: { title: "QA failed", reason: "Incorrect company", guidance: "Regenerate content." } }), /QA failed: Incorrect company Regenerate/);
  assert.match(leadSendabilityReason({ email: "lead@example.com", contentEmailSubject: "Subject", contentEmail: "Body" }), /channel setup/);
});

test("background refresh preserves unsaved review edits", () => {
  const saved = { contentEmailSubject: "Subject", contentEmail: "Body" };
  assert.equal(hasLeadContentEdits({ ...saved }, saved), false);
  assert.equal(hasLeadContentEdits({ ...saved, contentEmail: "My edit" }, saved), true);
  assert.equal(hasLeadContentEdits({ ...saved, contentLinkedin: "My LinkedIn edit" }, saved), true);
});

test("actual generation polling refreshes readiness before completion, on pause, and on failure", async () => {
  const hook = source.slice(source.indexOf("  const refreshAfterGeneration ="), source.indexOf("  const resetContentGenerationQueue ="));
  const compiled = ts.transpileModule(hook, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let nextPoll;
  let cleanup;
  let job = { id: "run1", state: "PROGRESS", pct: 10, leadStates: { success: 0, pending: 2 } };
  let refreshed = [];
  let requests = 0;
  let edited = { id: "lead1", contentEmail: "Unsaved edit" };
  const saved = { id: "lead1", contentEmail: "" };
  const context = {
    AbortController, campaignId: "campaign1", canManageLeadActions: true,
    contentGenerationQueue: { jobId: "run1" }, selectedLead: saved,
    generationStatus, generationLeadSnapshot, hasLeadContentEdits,
    useEffectEvent: (callback) => callback,
    useEffect: (callback) => { cleanup = callback(); },
    getGenerationJob: async () => job,
    getActiveGenerationJob: async () => { throw new Error("Unexpected active job lookup"); },
    api: { get: async () => { requests++; return { data: { leads: [{ id: "lead1", sendable: job.leadStates.success > 0, contentEmail: "Generated body" }] } }; } },
    mapCampaignLead: (lead) => lead, stabilizeLeadOrder: (leads) => leads,
    setLeads: (leads) => { refreshed = leads; }, setSelectedLead: () => {},
    setEditForm: (update) => { edited = update(edited); }, setContentGenerationQueue: () => {},
    EMPTY_CONTENT_GENERATION_QUEUE: {}, toast: { error: () => {} },
    setTimeout: (callback) => { nextPoll = callback; return 1; }, clearTimeout: () => {},
  };
  vm.runInNewContext(compiled, context);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush();
  assert.equal(requests, 1);
  assert.equal(refreshed[0].sendable, false);
  job = { ...job, pct: 50, leadStates: { success: 1, pending: 1 } };
  nextPoll(); await flush();
  assert.equal(requests, 2);
  assert.equal(refreshed[0].sendable, true);
  assert.equal(edited.contentEmail, "Unsaved edit");
  nextPoll(); await flush();
  assert.equal(requests, 2, "unchanged polls should not reload all leads");
  job = { ...job, state: "PAUSED" };
  nextPoll(); await flush();
  assert.equal(requests, 3);
  job = { ...job, state: "FAILURE" };
  nextPoll(); await flush();
  assert.equal(requests, 4);
  cleanup();
});
