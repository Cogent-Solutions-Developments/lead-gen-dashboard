import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as campaignPageCache from "../lib/campaignPageCache.ts";

const pagePath = new URL("../app/campaigns/page.tsx", import.meta.url);
const source = ts.createSourceFile("page.tsx", readFileSync(pagePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let fetchInitializer;
function findFetch(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "fetchData") {
    fetchInitializer = node.initializer.getText(source);
  }
  ts.forEachChild(node, findFetch);
}
findFetch(source);
assert.ok(fetchInitializer, "Campaign list fetch callback must exist");
const code = ts.transpileModule(`globalThis.fetchData = ${fetchInitializer};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

// Exercise the page's real fetch callback and cache with controlled network
// responses, so navigation and generation completion can overlap deterministically.
function createHarness() {
  campaignPageCache.invalidateCampaignPages();
  const state = { loading: false, items: [], loadError: null };
  const requests = [];
  const params = { status: "all", limit: 5, offset: 5, categories: ["Compliance"] };
  const context = {
    useCallback: (callback) => callback,
    ...campaignPageCache,
    currentQueryRef: { current: { cacheScope: "sales:user-1", pageParams: params, queryKey: "filtered-page-2", persona: "sales" } },
    latestFetchRef: { current: 0 },
    fetchInProgressRef: { current: false },
    campaignInfoCacheRef: { current: new Map() },
    listCampaigns(query, persona) {
      return new Promise((resolve, reject) => requests.push({ query, persona, resolve, reject }));
    },
    enrichCampaignMetadata: async (campaigns) => ({ campaigns, infoById: {}, failedIds: [] }),
    getCampaignInfo() {},
    getErrorMessage: (error) => error.message,
    toast: { error() {} },
  };
  for (const name of ["loading", "items", "totalItems", "loadedQueryKey", "categoryOptions", "metadataFailedCount", "loadError", "metadataLoading", "campaignInfoById"]) {
    context[`set${name[0].toUpperCase()}${name.slice(1)}`] = (value) => {
      state[name] = typeof value === "function" ? value(state[name]) : value;
    };
  }
  runInNewContext(code, context);
  return { state, requests, context, params, fetchData: context.fetchData };
}

const page = { campaigns: [{ id: "campaign-6", toApprove: 0 }], total: 10, hasMore: false, categories: ["Compliance"] };

test("generation completion overlapping a page/filter load displays results and clears loading", async () => {
  const view = createHarness();
  const navigation = view.fetchData({ force: false });
  assert.equal(view.state.loading, true);
  const generationRefresh = view.fetchData({ silent: true, showErrors: false });
  assert.equal(view.requests.length, 1, "overlapping requests share the current page fetch");
  assert.equal(view.requests[0].query, view.params);
  assert.equal(view.requests[0].persona, "sales");

  view.requests[0].resolve(page);
  await Promise.all([navigation, generationRefresh]);

  assert.equal(view.state.loading, false);
  assert.equal(view.context.fetchInProgressRef.current, false);
  assert.equal(view.state.loadedQueryKey, "filtered-page-2");
  assert.equal(view.state.items, page.campaigns);
  assert.equal(view.state.totalItems, 10);
  assert.equal(view.state.loadError, null);
});

test("an overlapping failed refresh clears loading and exposes the fetch error", async () => {
  const view = createHarness();
  const navigation = view.fetchData({ force: false });
  const generationRefresh = view.fetchData({ silent: true, showErrors: false });
  view.requests[0].reject(new Error("Campaign service unavailable"));
  await Promise.all([navigation, generationRefresh]);

  assert.equal(view.state.loading, false);
  assert.equal(view.context.fetchInProgressRef.current, false);
  assert.equal(view.state.loadError, "Campaign service unavailable");
});

test("a superseded fetch cannot clear loading or publish results before its replacement finishes", async () => {
  const view = createHarness();
  const navigation = view.fetchData({ force: false });
  campaignPageCache.invalidateCampaignPagesAfterMutation({ config: { method: "post" } });
  const generationRefresh = view.fetchData({ silent: true, showErrors: false });
  assert.equal(view.requests.length, 2, "the successful generation mutation requires a fresh request");

  view.requests[0].resolve({ ...page, campaigns: [{ id: "campaign-6", toApprove: 1 }] });
  await navigation;
  assert.equal(view.state.loading, true);
  assert.equal(view.context.fetchInProgressRef.current, true);
  assert.equal(view.state.items.length, 0);

  view.requests[1].resolve(page);
  await generationRefresh;
  assert.equal(view.state.loading, false);
  assert.equal(view.context.fetchInProgressRef.current, false);
  assert.equal(view.state.items, page.campaigns);
});
