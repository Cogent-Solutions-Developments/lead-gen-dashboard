import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import axios from "axios";
import ts from "typescript";
import * as campaignPageCache from "../lib/campaignPageCache.ts";

const params = { status: "all", limit: 4, offset: 0, categories: [], includeCategories: true };
const departments = [
  ["sales", "/api"],
  ["delegate-sales", "/api/delegate-sales"],
  ["delegates", "/api/delegates"],
  ["production", "/api/productions"],
];

// Execute the actual client and router modules with real Axios interceptors;
// replace only authentication and the network adapter.
function load(relativePath, dependencies) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: "https://api.example.com" } },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return mod.exports;
}

function createRouter(adapter) {
  const dependencies = {
    axios: { default: { create: (config) => axios.create({ ...config, adapter }) } },
    "@/lib/auth": { attachAuthToken: (config) => config },
    "@/lib/devNgrok": { getLocalDevNgrokHeaders: () => ({}) },
    "./campaignPageCache": campaignPageCache,
  };
  dependencies["./apiClient"] = load("lib/apiClient.ts", dependencies);
  return load("lib/apiRouter.ts", {
    ...dependencies,
    "@/lib/apiClient": dependencies["./apiClient"],
    "@/lib/persona": {},
    "@/lib/api": load("lib/api.ts", dependencies),
    "@/lib/apidelegatesales": load("lib/apidelegatesales.ts", dependencies),
    "@/lib/apidele": load("lib/apidele.ts", dependencies),
    "@/lib/apiproduction": load("lib/apiproduction.ts", dependencies),
  });
}

for (const [persona, prefix] of departments) {
  test(`${persona}: rejecting a pending lead refreshes To Approve on return to the list`, async () => {
    campaignPageCache.invalidateCampaignPages();
    let toApprove = 1;
    let listRequests = 0;
    const router = createRouter(async (config) => {
      let data;
      if (config.method === "get" && config.url === `${prefix}/campaigns`) {
        listRequests++;
        data = { campaigns: [{ id: "campaign-1", toApprove }], total: 1, hasMore: false, categories: [] };
      } else {
        assert.equal(config.method, "put");
        assert.equal(config.url, `${prefix}/leads/lead-1/reject`);
        toApprove = 0;
        data = { ok: true };
      }
      return { data, config, status: 200, statusText: "OK", headers: {} };
    });
    const scope = `${persona}:user-1`;
    const visitList = () => campaignPageCache.loadCampaignPage(
      scope, params, (query) => router.listCampaigns(query, persona)
    );

    assert.equal((await visitList()).campaigns[0].toApprove, 1);
    await visitList();
    assert.equal(listRequests, 1, "returning without a mutation reuses the fresh page");

    // Same client and request used by the campaign-detail rejection handler.
    await router.getApiKeyClient(persona).put("/api/leads/lead-1/reject");
    assert.equal(campaignPageCache.readCampaignPage(scope, params), undefined);
    assert.equal((await visitList()).campaigns[0].toApprove, 0);
    assert.equal(listRequests, 2, "returning after rejection fetches immediately, before cache expiry");
  });

  test(`${persona}: detail reads and failed mutations preserve the cached campaign page`, async () => {
    campaignPageCache.invalidateCampaignPages();
    const router = createRouter(async (config) => {
      const response = { data: { id: "campaign-1" }, config, status: 200, statusText: "OK", headers: {} };
      if (config.method === "put") {
        response.status = 500;
        throw new axios.AxiosError("Rejection failed", "ERR_BAD_RESPONSE", config, undefined, response);
      }
      return response;
    });
    const scope = `${persona}:user-1`;
    const page = { campaigns: [{ id: "campaign-1", toApprove: 1 }], total: 1, hasMore: false, categories: [] };
    await campaignPageCache.loadCampaignPage(scope, params, async () => page);

    const client = router.getApiKeyClient(persona);
    await client.get("/api/campaigns/campaign-1");
    assert.equal(campaignPageCache.readCampaignPage(scope, params), page);
    await assert.rejects(client.put("/api/leads/lead-1/reject"), /Rejection failed/);
    assert.equal(campaignPageCache.readCampaignPage(scope, params), page);
  });
}
