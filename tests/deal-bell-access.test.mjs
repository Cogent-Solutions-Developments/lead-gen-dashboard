import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { canRingDealBell } from "../lib/dealBellAccess.ts";

function load(path, dependencies, globals = {}) {
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, { module: mod, exports: mod.exports, Request, Response,
    process: { env: { NEXT_PUBLIC_API_BASE_URL: "https://api.example.com", TEAMS_DEAL_BELL_WEBHOOK_URL: "https://teams.example.com/webhook" } },
    ...globals, require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error("Unexpected dependency: " + name);
    },
  });
  return mod.exports;
}

const cases = [
  ["sales_user", [], true], ["sales_manager_user", [], true],
  ["delegate_sales_user", [], true], ["delegate_sales_manager_user", [], true],
  ["production_user", ["delegate_sales"], true], ["delegate_manager_user", ["delegate_sales"], true],
  ["production_manager_user", ["sales"], true],
  ["production_user", [], false], ["delegate_user", ["production"], false],
  ["client_user", ["delegate_sales"], false], ["marketing_user", ["delegate_sales"], false],
  ["super_admin", ["delegate_sales"], false],
];
for (const [role, assignments, allowed] of cases) {
  test("bell endpoint checks verified " + role + " / " + assignments, async () => {
    assert.equal(canRingDealBell({ role, departmentAssignments: assignments }), allowed);
    const calls = [];
    const fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/me")) return Response.json({
        user: { id: "employee-1", username: "amina", fullName: "Amina Silva", role,
          departmentAssignments: [...assignments, null, { department: "sales" }] },
      });
      return new Response("ok");
    };
    const auth = load("lib/server/apiAuth.ts", { "@/lib/devNgrok": { getLocalDevNgrokHeaders: () => ({}) } }, { fetch });
    const route = load("app/api/ring-bell/route.ts", {
      "@/lib/server/apiAuth": auth, "@/lib/dealBellAccess": { canRingDealBell },
    }, { fetch });
    const response = await route.POST(new Request("https://app.example.com/api/ring-bell", {
      method: "POST", headers: { Authorization: "Bearer test" },
      body: JSON.stringify({ userName: "Spoofed", departmentAssignments: ["delegate_sales"] }),
    }));
    assert.equal(response.status, allowed ? 200 : 403);
    assert.equal(calls.length, allowed ? 2 : 1);
    if (allowed) {
      assert.match(JSON.parse(calls[1].options.body).text, /Amina/);
      assert.doesNotMatch(JSON.parse(calls[1].options.body).text, /Spoofed/);
    }
  });
}

test("expired and missing sessions never reach the bell webhook", async () => {
  for (const authorization of ["", "Bearer revoked"]) {
    const calls = [];
    const fetch = async url => { calls.push(url); return new Response(null, { status: 401 }); };
    const auth = load("lib/server/apiAuth.ts", { "@/lib/devNgrok": { getLocalDevNgrokHeaders: () => ({}) } }, { fetch });
    const route = load("app/api/ring-bell/route.ts", {
      "@/lib/server/apiAuth": auth, "@/lib/dealBellAccess": { canRingDealBell },
    }, { fetch });
    const response = await route.POST(new Request("https://app.example.com/api/ring-bell", {
      method: "POST", headers: authorization ? { Authorization: authorization } : {},
    }));
    assert.equal(response.status, 401);
    assert.equal(calls.length, authorization ? 1 : 0);
  }
});
