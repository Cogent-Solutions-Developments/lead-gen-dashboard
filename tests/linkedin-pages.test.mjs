import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as pageTypes from "../lib/linkedinPages.ts";

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
      if (name === "@/lib/linkedinPagesApi") return api;
      if (name === "@/lib/linkedinPages") return pageTypes;
      if (name === "next/link") return "a";
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  function render() { cursor = 0; tree = mod.exports[exportName](props); }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach((child) => all(predicate, child, found)); return found; }
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

test("a page shows Upload Campaign, its stored campaigns, and page-scoped View Leads links", async () => {
  const calls = [];
  const view = harness("components/linkedin/LinkedInCampaignList.tsx", "LinkedInCampaignList", {
    listLinkedInCampaigns: async (pageId, params) => {
      calls.push({ pageId, params });
      return { campaigns: [savedCampaign], total: 1, hasMore: false };
    },
  }, { page: savedPage });
  await view.flush();
  assert.equal(calls[0].pageId, savedPage.id);
  assert.equal(calls[0].params.limit, 6);
  assert.equal(calls[0].params.offset, 0);
  assert.equal(view.find((node) => node.props?.href === savedPage.url).props.rel, "noopener noreferrer");
  assert.ok(view.all((node) => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}/campaigns/${savedCampaign.id}`).length);
  const pager = view.find((node) => node.props?.pageSize === 6);
  pager.props.onChange(1);
  view.render();
  assert.ok(view.all((node) => node.props?.href?.endsWith?.(`/campaigns/${savedCampaign.id}`)).length, "clicking the current page keeps results visible");
  view.find((node) => node.props?.children?.includes?.("Upload Campaign")).props.onClick();
  view.render();
  assert.equal(view.find((node) => typeof node.props?.onSaved === "function").props.page.id, savedPage.id);
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

test("a campaign opens only its page-scoped lead sheet with pagination", async () => {
  const calls = [];
  const view = harness("components/linkedin/LinkedInCampaignWorkspace.tsx", "LinkedInCampaignWorkspace", {
    getLinkedInCampaign: async (pageId, campaignId, params) => {
      calls.push({ pageId, campaignId, params });
      return { page: savedPage, campaign: savedCampaign, items: [{ id: "lead-1", name: "Jane Doe", jobTitle: "CEO", company: "Example", email: "jane@example.test", phone: "" }], total: 2, hasMore: false };
    },
  }, { pageId: savedPage.id, campaignId: savedCampaign.id });
  await view.flush();
  assert.equal(calls[0].pageId, savedPage.id);
  assert.equal(calls[0].campaignId, savedCampaign.id);
  assert.equal(calls[0].params.limit, 25);
  assert.equal(view.find((node) => node.props?.title === savedCampaign.name).props.description, savedPage.name);
  assert.ok(view.find((node) => node.props?.href === `/admin/lead-intelligence/linkedin/${savedPage.id}`));
  assert.ok(view.find((node) => node.props?.children === "Jane Doe"));
  view.find((node) => node.props?.pageSize === 25).props.onChange(1);
  view.render();
  assert.ok(view.find((node) => node.props?.children === "Jane Doe"));
});
