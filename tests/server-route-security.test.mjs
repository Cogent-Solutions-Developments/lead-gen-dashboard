import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

for (const routePath of [
  "app/api/whatsapp/events/route.ts",
  "app/api/whatsapp/inbound/route.ts",
]) {
  test(`${routePath} requires verified super-admin authentication`, () => {
    const route = read(routePath);

    assert.match(route, /verifyBackendUser\(request\)/);
    assert.match(route, /user\.role !== "super_admin_user"/);
    assert.match(route, /Authorization:/);
    assert.match(route, /"Cache-Control": "no-store"/);
  });
}

test("the inbound WhatsApp proxy bounds query input", () => {
  const route = read("app/api/whatsapp/inbound/route.ts");

  assert.match(route, /Math\.min\(Math\.max\(requestedLimit, 1\), 100\)/);
  assert.match(route, /personId\.length > 120/);
});
