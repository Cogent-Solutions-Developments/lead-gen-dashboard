import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("permanent account deletion uses its own confirmed backend action", () => {
  const api = read("app/admin/admin-api.ts");

  assert.match(api, /export async function permanentlyDeleteAuthUser\(userId: string, confirmation: string\)/);
  assert.match(api, /\/api\/auth\/users\/\$\{encodeURIComponent\(userId\)\}\/permanent-delete/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /body: JSON\.stringify\(\{ confirmation \}\)/);
});

test("permanent deletion is super-admin-only and requires exact typed confirmation", () => {
  const page = read("app/admin/users/page.tsx");

  assert.match(page, /canPermanentlyDelete=\{isSuperAdmin\}/);
  assert.match(page, /permanentDeleteConfirmation !== "delete"/);
  assert.match(page, /if \(!permanentDeleteTarget \|\| permanentDeleteConfirmation !== "delete"\) return/);
  assert.match(page, /Type <span[^>]*>delete<\/span> to confirm/);
  assert.match(page, /Delete account permanently/);
  assert.match(page, /This action cannot be undone\./);
});
