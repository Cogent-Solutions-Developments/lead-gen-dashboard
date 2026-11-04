import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function navigation(role, assignments = []) {
  const compiled = { exports: {} };
  const source = readFileSync(new URL("../lib/marketing-navigation.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {
    module: compiled, exports: compiled.exports, URLSearchParams,
    require(name) {
      if (name === "lucide-react") return {};
      if (name === "@/lib/auth") return { getAuthLandingPath: role => role.startsWith("marketing_") ? "/marketing" : "/dashboard" };
      throw new Error(name);
    },
  });
  return compiled.exports.marketingNavigation({role, departmentAssignments: assignments}, "conference");
}
for (const role of ["sales_user", "delegate_user", "production_user", "delegate_sales_user", "marketing_user", "marketing_manager_user", "marketing_designer_user", "marketing_developer_user", "ceo_user", "super_admin_user"]) {
  test(`${role}: only Agenda and Materials, even with manager/social responsibilities`, () => {
    const items = navigation(role, ["marketing_manager_user", "marketing_social"]).filter(item => item.href.startsWith("/marketing?"));
    assert.deepEqual(Array.from(items, item => item.key), ["agenda", "materials"]);
    assert.ok(items.every(item => item.href.includes("event=conference")));
  });
}
