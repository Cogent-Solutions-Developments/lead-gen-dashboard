import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as outreachTypes from "../lib/automatedOutreach.ts";
import * as pageTypes from "../lib/linkedinPages.ts";
import * as contentStatus from "../lib/outreachContentStatus.ts";
import * as outreachActivity from "../lib/outreachActivity.ts";

const savedPage = { id: "saved-page", name: "Saved page", url: "https://www.linkedin.com/company/saved-page/", createdAt: "2026-11-19T00:00:00Z" };
const settle = () => new Promise((resolve) => setImmediate(resolve));

function harness(file, exportName, api, props = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const slots = [];
  const pendingEffects = [];
  let cursor = 0;
  let tree;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod, exports: mod.exports, AbortController,
    document: { activeElement: null },
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return {
        useState(initial) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
          return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
        },
        useRef(initial) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = { current: initial };
          return slots[index];
        },
        useEffect(callback, dependencies) {
          const index = cursor++;
          const previous = slots[index];
          if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
            pendingEffects.push(() => {
              previous?.cleanup?.();
              slots[index] = { dependencies, cleanup: callback() };
            });
          }
        },
      };
      if (name === "@/lib/linkedinPagesApi" || name === "@/lib/automatedOutreachApi") return api;
      if (name === "@/lib/automatedOutreach") return outreachTypes;
      if (name === "@/lib/outreachContentStatus") return contentStatus;
      if (name === "@/lib/outreachActivity") return outreachActivity;
      if (name === "@/hooks/useOutreachResource") return { useOutreachResource: api.resource };
      if (name === "@/lib/auth") return { listActiveEventRegistry: api.listActiveEventRegistry ?? (async () => []) };
      if (name === "@/lib/linkedinPages") return pageTypes;
      if (name === "next/link") return "a";
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  function render() { cursor = 0; tree = mod.exports[exportName](props); }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach((child) => all(predicate, child ?? null, found)); return found; }
    if (!node || typeof node !== "object") return found;
    if (predicate(node)) found.push(node);
    all(predicate, node.props?.children ?? null, found);
    return found;
  }
  function find(predicate) { const match = all(predicate)[0]; assert.ok(match, "Missing UI control"); return match; }
  async function flush() { pendingEffects.splice(0).forEach((effect) => effect()); await settle(); render(); }
  render();
  return { render, flush, find, all };
}

test("LinkedIn lead dots and scheduling appear only after templates are saved", () => {
  const lead = { id: "lead-1", department: "linkedin", eventKey: "campaign-1", eventName: "Campaign",
    email: "jane@example.test", lead: { name: "Jane Doe" }, state: "active", workflowStatus: "new",
    sentCount: 0, templatesReady: false, messages: [], nextDueAt: "2026-11-19T14:18:00Z" };
  const view = harness("components/automated-outreach/OutreachLeadRow.tsx", "OutreachLeadRow", {}, { lead, number: 1, reload() {} });
  const indicators = () => view.all(node => node.props?.["aria-label"] === "Content generation status"
    || node.props?.["aria-label"]?.startsWith("Delivery tracking for"));
  const nextDates = () => view.all(node => node.type === "p" && node.props?.children?.[0] === "Next: ");
  assert.equal(indicators().length, 0);
  assert.equal(nextDates().length, 0); // Legacy timestamps must also stay hidden.
  assert.equal(view.find(node => node.props?.["aria-label"] === "View messages for Jane Doe").props.disabled, true);
  assert.ok(view.find(node => node.props?.children === "Save templates first"));
  lead.templatesReady = true;
  view.render();
  assert.equal(indicators().length, 2);
  assert.equal(nextDates().length, 1);
  assert.equal(view.find(node => node.props?.["aria-label"] === "View messages for Jane Doe").props.disabled, false);
  lead.state = "paused";
  view.render();
  assert.equal(indicators().length, 2);
  assert.equal(nextDates().length, 0);
});

test("existing sent history and other departments retain their delivery indicators", () => {
  for (const [department, sentCount] of [["linkedin", 1], ["sales", 0]]) {
    const lead = { id: "lead-1", department, eventKey: "campaign-1", eventName: "Campaign",
      email: "jane@example.test", lead: { name: "Jane Doe" }, state: "active", workflowStatus: "follow-up",
      sentCount, templatesReady: false, messages: [], nextDueAt: "2026-11-25T14:18:00Z" };
    const view = harness("components/automated-outreach/OutreachLeadRow.tsx", "OutreachLeadRow", {}, { lead, number: 1, reload() {} });
    assert.equal(view.all(node => node.props?.["aria-label"]?.startsWith("Delivery tracking for")).length, 1);
    assert.equal(view.all(node => node.type === "p" && node.props?.children?.[0] === "Next: ").length, 1);
  }
});

test("Add Page saves once, preserves its values while saving, and returns the stored page", async () => {
  const calls = [], saved = [];
  let finish, closed = 0;
  const view = harness("components/linkedin/AddLinkedInPageDialog.tsx", "AddLinkedInPageDialog", {
    createLinkedInPage: (payload) => { calls.push(payload); return new Promise((resolve) => { finish = resolve; }); },
  }, { onSaved: (page) => saved.push(page), onClose: () => closed++ });
  view.find((node) => node.props?.id === "linkedin-page-name").props.onChange({ target: { value: "  Saved page  " } });
  view.find((node) => node.props?.id === "linkedin-page-url").props.onChange({ target: { value: savedPage.url } });
  view.render();
  const submit = view.find((node) => node.type === "form").props.onSubmit;
  const first = submit({ preventDefault() {} });
  await submit({ preventDefault() {} });
  view.render();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "Saved page");
  assert.equal(calls[0].url, savedPage.url);
  assert.equal(view.find((node) => node.props?.type === "submit").props.disabled, true);
  view.find((node) => node.type === "dialog").props.onCancel({ preventDefault() {} });
  assert.equal(closed, 0);
  finish(savedPage);
  await first;
  assert.deepEqual(saved, [savedPage]);
  assert.equal(closed, 1);
});

test("duplicate save shows the server error and keeps the form open for correction", async () => {
  let closed = false;
  const view = harness("components/linkedin/AddLinkedInPageDialog.tsx", "AddLinkedInPageDialog", {
    createLinkedInPage: async () => { throw { data: { detail: "This LinkedIn page has already been added." } }; },
  }, { onSaved: () => assert.fail("A failed create must not add a card"), onClose: () => { closed = true; } });
  view.find((node) => node.props?.id === "linkedin-page-name").props.onChange({ target: { value: "Existing page" } });
  view.find((node) => node.props?.id === "linkedin-page-url").props.onChange({ target: { value: savedPage.url } });
  view.render();
  await view.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(view.find((node) => node.props?.role === "alert").props.children, "This LinkedIn page has already been added.");
  assert.equal(view.find((node) => node.props?.id === "linkedin-page-name").props.value, "Existing page");
  assert.equal(view.find((node) => node.props?.type === "submit").props.disabled, false);
  assert.equal(closed, false);
});

test("saved pages survive a fresh picker load and older list requests cannot erase a new page", async () => {
  let oldResponse;
  let calls = 0;
  const view = harness("app/admin/lead-intelligence/linkedin/page.tsx", "default", {
    listLinkedInPages: () => ++calls === 1 ? new Promise((resolve) => { oldResponse = resolve; }) : Promise.resolve([savedPage]),
  });
  await view.flush();
  view.find((node) => node.props?.children?.includes?.("Add Page")).props.onClick();
  view.render();
  view.find((node) => typeof node.props?.onSaved === "function").props.onSaved(savedPage);
  oldResponse([]);
  await settle();
  view.render();
  assert.equal(view.all((node) => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}`).length, 1);
  await view.flush();
  assert.equal(calls, 2);
  assert.equal(view.all((node) => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}`).length, 1);

  const refreshed = harness("app/admin/lead-intelligence/linkedin/page.tsx", "default", { listLinkedInPages: async () => [savedPage] });
  await refreshed.flush();
  assert.equal(refreshed.all((node) => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}`).length, 1);
});

test("a selected database page loads by its stored ID and opens its campaign workspace", async () => {
  let requested;
  const view = harness("components/linkedin/LinkedInPageWorkspace.tsx", "LinkedInPageWorkspace", {
    getLinkedInPage: async (id) => { requested = id; return savedPage; },
  }, { pageId: savedPage.id });
  await view.flush();
  assert.equal(requested, savedPage.id);
  assert.equal(view.find((node) => node.props?.page?.id === savedPage.id).props.page, savedPage);
});

const savedCampaign = {
  id: "campaign-1", pageId: savedPage.id, name: "November leads", fileName: "leads.csv", totalLeads: 2,
  importSummary: { raw_rows: 2, invalid_rows: 0, duplicates_collapsed: 0 }, status: "uploaded",
  createdAt: "2026-11-19T00:00:00Z", createdBy: "Admin",
};

test("a LinkedIn page uses the Outreach event list and reloads it after upload", () => {
  const view = harness("components/linkedin/LinkedInCampaignList.tsx", "LinkedInCampaignList", {}, { page: savedPage });
  const list = view.find(node => node.type === "OutreachEvents");
  assert.equal(list.props.department, "linkedin");
  assert.equal(list.props.linkedinPageId, savedPage.id);
  assert.equal(list.props.title, "LinkedIn campaigns");
  assert.equal(list.props.description, savedPage.name);
  assert.equal(list.props.backHref, "/admin/lead-intelligence/linkedin");
  list.props.actions.props.onClick(); view.render();
  const dialog = view.find(node => node.type === "UploadLinkedInCampaignDialog");
  assert.equal(dialog.props.page.id, savedPage.id);
  dialog.props.onSaved(savedCampaign); view.render();
  assert.notEqual(view.find(node => node.type === "OutreachEvents").key, list.key);
});

test("partial uploads show their summary immediately and retain it when reopened", async () => {
  const campaign = {...savedCampaign, importSummary: {raw_rows: 4, import_rows: 2, invalid_rows: 1, duplicates_collapsed: 1, invalid_reasons: ["Row 5: missing employee name"]}};
  const props = {page: savedPage};
  const list = harness("components/linkedin/LinkedInCampaignList.tsx", "LinkedInCampaignList", {}, props);
  list.find(node => node.type === "OutreachEvents").props.actions.props.onClick();
  list.render();
  list.find(node => node.type === "UploadLinkedInCampaignDialog").props.onSaved(campaign);
  list.render();
  assert.equal(list.find(node => node.type === "LinkedInImportSummary").props.campaign, campaign);
  props.page = {...savedPage, id: "another-page"};
  list.render();
  assert.equal(list.all(node => node.type === "LinkedInImportSummary").length, 0);

  const reopened = harness("components/linkedin/LinkedInCampaignWorkspace.tsx", "LinkedInCampaignWorkspace", {
    getLinkedInCampaign: async () => ({page: savedPage, campaign, items: [], total: 2, hasMore: false}),
  }, {pageId: savedPage.id, campaignId: campaign.id});
  await reopened.flush();
  assert.equal(reopened.find(node => node.type === "LinkedInImportSummary").props.campaign, campaign);

  const summary = harness("components/linkedin/LinkedInImportSummary.tsx", "LinkedInImportSummary", {}, {campaign});
  assert.equal(summary.all(node => node.type === "li").length, 0);
  assert.equal(summary.all(node => node.type === "div").length, 0);
  const text = summary.find(node => node.props?.role === "status").props.children.join("");
  assert.match(text, /2 leads imported from 4 rows/);
  assert.match(text, /1 invalid rows skipped/);
  assert.match(text, /1 duplicate rows combined/);
});

test("import summaries show counts without skipped-row warnings", () => {
  const complete = harness("components/linkedin/LinkedInImportSummary.tsx", "LinkedInImportSummary", {}, {campaign: savedCampaign});
  assert.equal(complete.all(node => node.type === "li").length, 0);
  assert.equal(complete.all(node => node.type === "div").length, 0);
  assert.match(complete.find(node => node.props?.role === "status").props.children.join(""), /2 leads imported from 2 rows/);
  const old = harness("components/linkedin/LinkedInImportSummary.tsx", "LinkedInImportSummary", {}, {
    campaign: {...savedCampaign, importSummary: {raw_rows: 3, invalid_rows: 1, duplicates_collapsed: 0}},
  });
  assert.equal(old.all(node => node.type === "div").length, 0);
  assert.match(old.find(node => node.props?.role === "status").props.children.join(""), /1 invalid rows skipped/);
});

test("LinkedIn campaigns use page-scoped Outreach rows and the shared mode and delivery endpoints", async () => {
  let requested;
  const calls = [];
  const event = {key: savedCampaign.id, name: savedCampaign.name, leads: 2, active: 2, statuses: {new: 2}, outreachEnabled: false, contentMode: "template", templatesReady: false};
  const view = harness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    resource: path => { requested = path; return {data: {items: [event], revision: 4, enabled: true}, reload(){}, refreshing: false}; },
    setEventContentMode: async (...args) => {calls.push(args); return {revision: 5};},
    setEventOutreach: async (...args) => {calls.push(args); return {revision: 6};},
  }, {department: "linkedin", linkedinPageId: savedPage.id, title: savedPage.name});
  const params = new URLSearchParams(requested.split("?")[1]);
  assert.equal(params.get("department"), "linkedin");
  assert.equal(params.get("linkedinPageId"), savedPage.id);
  assert.ok(view.find(node => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}/campaigns/${savedCampaign.id}`));
  const mode = view.find(node => node.type === "OutreachModeToggle");
  assert.equal(mode.props.value, "template");
  assert.match(mode.props.generatedDisabledReason, /custom configuration/);
  await mode.props.onChange("template"); await settle(); view.render();
  assert.deepEqual(Array.from(calls[0]), ["linkedin", savedCampaign.id, "template", 4]);
  const toggle = view.find(node => typeof node.type === "function" && node.props?.label === `Automatic email delivery for ${event.name}`);
  assert.equal(toggle.props.checked, false);
  await toggle.props.onChange(true); await settle(); view.render();
  assert.deepEqual(Array.from(calls[1]), ["linkedin", savedCampaign.id, true, 5]);
});

test("upload submits a CSV to the selected page once and publishes the saved campaign", async () => {
  const calls = [], saved = [];
  let finish, closed = 0;
  const file = new File(["Full Name,Email\nJane,jane@example.test"], "leads.csv");
  const view = harness("components/linkedin/UploadLinkedInCampaignDialog.tsx", "UploadLinkedInCampaignDialog", {
    uploadLinkedInCampaign: (pageId, name, selectedFile) => {
      calls.push({ pageId, name, file: selectedFile });
      return new Promise((resolve) => { finish = resolve; });
    },
  }, { page: savedPage, onSaved: (campaign) => saved.push(campaign), onClose: () => closed++ });
  view.find((node) => node.props?.id === "linkedin-campaign-name").props.onChange({ target: { value: "  November leads  " } });
  view.find((node) => node.props?.id === "linkedin-campaign-file").props.onChange({ target: { files: [file] } });
  view.render();
  const submit = view.find((node) => node.type === "form").props.onSubmit;
  const first = submit({ preventDefault() {} });
  await submit({ preventDefault() {} });
  view.render();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pageId, savedPage.id);
  assert.equal(calls[0].name, "November leads");
  assert.equal(calls[0].file, file);
  assert.equal(view.find((node) => node.props?.type === "submit").props.disabled, true);
  view.find((node) => node.type === "dialog").props.onCancel({ preventDefault() {} });
  assert.equal(closed, 0);
  finish(savedCampaign);
  await first;
  assert.deepEqual(saved, [savedCampaign]);
  assert.equal(closed, 1);
});

test("invalid sheets do not upload, and server failures keep the campaign form open", async () => {
  let calls = 0;
  const view = harness("components/linkedin/UploadLinkedInCampaignDialog.tsx", "UploadLinkedInCampaignDialog", {
    uploadLinkedInCampaign: async () => { calls++; throw { data: { detail: "No valid lead rows found" } }; },
  }, { page: savedPage, onSaved: () => assert.fail("Failed upload must not add a campaign"), onClose: () => assert.fail("Failed upload must stay open") });
  view.find((node) => node.props?.id === "linkedin-campaign-name").props.onChange({ target: { value: "Campaign" } });
  view.find((node) => node.props?.id === "linkedin-campaign-file").props.onChange({ target: { files: [{ name: "large.csv", size: 21 * 1024 * 1024 }] } });
  view.render();
  await view.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 0);
  view.find((node) => node.props?.id === "linkedin-campaign-file").props.onChange({ target: { files: [new File(["invalid"], "leads.csv")] } });
  view.render();
  await view.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(calls, 1);
  assert.equal(view.find((node) => node.props?.role === "alert").props.children, "No valid lead rows found");
  assert.equal(view.find((node) => node.props?.id === "linkedin-campaign-name").props.value, "Campaign");
});

test("a page-validated campaign opens the shared Outreach lead sheet and sequence settings", async () => {
  const calls = [];
  const view = harness("components/linkedin/LinkedInCampaignWorkspace.tsx", "LinkedInCampaignWorkspace", {
    getLinkedInCampaign: async (pageId, campaignId) => {
      calls.push({pageId, campaignId});
      return {page: savedPage, campaign: savedCampaign, items: [], total: 2, hasMore: false};
    },
  }, {pageId: savedPage.id, campaignId: savedCampaign.id});
  await view.flush();
  assert.equal(calls[0].pageId, savedPage.id);
  assert.equal(calls[0].campaignId, savedCampaign.id);
  const sheet = view.find(node => node.type === "OutreachLeadTable");
  assert.equal(sheet.props.department, "linkedin");
  assert.equal(sheet.props.eventKey, savedCampaign.id);
  assert.equal(sheet.props.title, savedCampaign.name);
  assert.equal(sheet.props.backHref, `/admin/lead-intelligence/linkedin/${savedPage.id}`);
});

test("a campaign from another page cannot open Outreach controls", async () => {
  const view = harness("components/linkedin/LinkedInCampaignWorkspace.tsx", "LinkedInCampaignWorkspace", {
    getLinkedInCampaign: async () => { throw {data: {detail: "Campaign not found for this LinkedIn page."}}; },
  }, {pageId: savedPage.id, campaignId: "other-campaign"});
  await view.flush();
  assert.equal(view.all(node => node.type === "OutreachLeadTable").length, 0);
  assert.ok(view.find(node => node.props?.role === "alert"));
});


test("an uploaded LinkedIn campaign can save missing event context once without enabling delivery", async () => {
  const calls = [];
  let finish, saved = 0;
  const campaign = {...savedCampaign, eventKey: null};
  const view = harness("components/linkedin/LinkedInCampaignEventSettings.tsx", "LinkedInCampaignEventSettings", {
    listActiveEventRegistry: async () => [{eventKey: "asset-integrity", eventName: "Asset Integrity Conference"}],
    updateLinkedInCampaignEvent: (...args) => {calls.push(args); return new Promise(resolve => {finish=resolve;});},
  }, {campaign, onSaved: () => saved++});
  await view.flush();
  assert.ok(view.find(node => node.props?.role === "status"));
  view.find(node => node.props?.id === "linkedin-linked-event").props.onChange({target:{value:"asset-integrity"}});
  view.render();
  const save = view.find(node => node.props?.children === "Save event").props.onClick;
  save(); save(); view.render();
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0]), [campaign.pageId,campaign.id,"asset-integrity"]);
  assert.equal(view.find(node => node.type === "Button").props.disabled, true);
  finish({...campaign,eventKey:"asset-integrity"}); await settle(); view.render();
  assert.equal(saved, 1);
});

test("a rejected event change keeps its selection and displays the server reason", async () => {
  const view = harness("components/linkedin/LinkedInCampaignEventSettings.tsx", "LinkedInCampaignEventSettings", {
    updateLinkedInCampaignEvent: async () => {throw {data:{detail:"Wait for delivery to finish"}};},
  }, {campaign:savedCampaign,onSaved:()=>assert.fail("No successful event save")});
  await view.flush();
  view.find(node => node.props?.id === "linkedin-linked-event").props.onChange({target:{value:"asset-integrity"}});
  view.render();view.find(node => node.props?.children === "Save event").props.onClick();await settle();view.render();
  assert.equal(view.find(node=>node.props?.role === "alert").props.children,"Wait for delivery to finish");
  assert.equal(view.find(node=>node.props?.id === "linkedin-linked-event").props.value,"asset-integrity");
});


test("LinkedIn campaign rows surface missing mail routing instead of implying delivery is ready", () => {
  const issue = "Configure an active Sales mail webhook in Settings.";
  const view = harness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    resource: () => ({data:{items:[{key:savedCampaign.id,name:savedCampaign.name,leads:2,active:2,statuses:{new:2},outreachEnabled:true,contentMode:"template",templatesReady:true,deliveryIssues:[issue]}],revision:1,enabled:true},reload(){}}),
  }, {department:"linkedin",linkedinPageId:savedPage.id});
  assert.equal(view.find(node=>node.type === "li" && node.props?.children === issue).props.children,issue);
  assert.ok(view.find(node=>node.props?.href === "/settings?section=outreach&department=sales"));
});


test("LinkedIn disables Agentic while template mode remains selectable", () => {
  const changes = [];
  const view = harness("components/automated-outreach/OutreachModeToggle.tsx", "OutreachModeToggle", {}, {
    value:"template", label:"LinkedIn mode", generatedDisabledReason:outreachTypes.LINKEDIN_AGENTIC_DISABLED_REASON, onChange:mode=>changes.push(mode),
  });
  const buttons = view.all(node=>node.type === "button");
  assert.equal(buttons[0].props.disabled,false);
  assert.equal(buttons[1].props.disabled,true);
  buttons[1].props.onClick();
  assert.deepEqual(changes,[]);
  buttons[0].props.onClick();
  assert.deepEqual(changes,["template"]);
  assert.equal(outreachTypes.eventContentMode({contentMode:"generated",eventContentModes:{linkedin:{campaign:"generated"}}},"linkedin","campaign"),"template");
});


test("LinkedIn sequence setup reads Sales-scoped delivery readiness and links to Sales mail settings", () => {
  let requested;
  const view = harness("components/automated-outreach/OutreachEventSettings.tsx", "OutreachEventSettings", {
    resource: path => {requested=path; return {data:{revision:1,contentMode:"template",mailWebhookGroup:"sales",missingConfiguration:[],eventOutreach:{linkedin:{campaign:false}}},reload(){}};},
  }, {department:"linkedin",eventKey:"campaign",eventName:"Asset Integrity",onSaved(){}});
  assert.equal(requested,"/configuration?department=linkedin");
  assert.ok(view.find(node=>node.props?.href === "/settings?section=outreach&department=sales"));
  assert.equal(view.all(node=>node.props?.children === "Outreach setup needs attention").length,0);
});
