import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { isSalesPerformancePipeline } from "../lib/managerPerformance.ts";

const nativeRequire = createRequire(import.meta.url);
const response = {
  period: { key: "daily", start: "2026-11-02", end: "2026-11-03" },
  managerScope: { persona: "delegate-sales", managerUserId: "manager-1" },
  summary: { totalUsers: 1, activeUsers: 1, kpiTotal: 0, revenueUsd: 5600, activityCount: 1 },
  teamUsers: [{ id: "seller-1", role: "delegate_sales_user", fullName: "Seller" }],
  perUserPerformance: [{ userId: "seller-1", username: "seller", fullName: "Seller", totals: { kpiCount: 0, revenueUsd: 5600 } }],
  activities: [{ id: "close-1", userId: "seller-1", userDisplayName: "Seller", workflowStatus: "deal-closed", dealAmountUsd: 5600, leadSnapshot: { employeeName: "Lead" } }],
};
function load(relativePath, dependencies, fetch) {
  const source = readFileSync(new URL("../" + relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod, exports: mod.exports, URLSearchParams, Headers, Response, fetch,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: "https://api.example.com" } },
    require: name => name in dependencies ? dependencies[name] : nativeRequire(name),
  });
  return mod.exports;
}
for (const modulePath of ["lib/auth.ts", "app/admin/admin-api.ts"]) {
  test(`${modulePath} keeps Delegate Sales routing and revenue for a dual-department manager`, async () => {
    const calls = [];
    const fetch = async url => { calls.push(new URL(url)); return Response.json(response); };
    const auth = load("lib/auth.ts", {
      "@/lib/devNgrok": { getLocalDevNgrokHeaders: () => ({}) },
      "@/lib/teamLeads": { attachTeamLeadRequestHeaders: config => config, clearTeamLeadRequestScope() {} },
    }, fetch);
    const api = modulePath === "lib/auth.ts" ? auth : load(modulePath, {
      "@/lib/auth": auth, "@/lib/devNgrok": { getLocalDevNgrokHeaders: () => ({}) },
    }, fetch);
    const result = await api.fetchManagerUserPerformance({ pipeline: "delegate_sales", period: "daily", date: "2026-11-02" });
    assert.equal(calls[0].pathname, "/api/manager/performance");
    assert.equal(calls[0].searchParams.get("pipeline"), "delegate_sales");
    assert.equal(result.clusters[0].pipeline, "delegate_sales");
    assert.equal(result.clusters[0].label, "Delegate Sales");
    assert.equal(result.clusters[0].revenueUsd, 5600);
    assert.equal(result.clusters[0].runners[0].revenueUsd, 5600);
    assert.equal(result.clusters[0].total, 0);
    assert.equal(result.summary.revenueUsd, 5600);
    assert.equal(result.activities[0].pipeline, "delegate_sales");
    assert.equal(result.activities[0].dealAmountUsd, 5600);
  });
}
test("both sales departments use the existing revenue display", () => {
  assert.equal(isSalesPerformancePipeline("sales"), true);
  assert.equal(isSalesPerformancePipeline("delegate_sales"), true);
  assert.equal(isSalesPerformancePipeline("delegate-sales"), true);
  assert.equal(isSalesPerformancePipeline("delegate"), false);
  assert.equal(isSalesPerformancePipeline("production"), false);
});
