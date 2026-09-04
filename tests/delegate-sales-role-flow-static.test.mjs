import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app/admin/users/page.tsx", import.meta.url), "utf8");

test("Delegate Sales is managed inside the update-user roles multi-select", () => {
  assert.match(source, /function UserRoleMultiSelect/);
  assert.match(source, /role="menuitemcheckbox"/);
  assert.match(source, /Choose one primary role and optionally add Delegate Sales\./);
  assert.doesNotMatch(source, /Assign Delegate Sales/);
  assert.doesNotMatch(source, /onToggleDelegateSales/);
});

test("saving an edited user persists the primary and Delegate Sales selections", () => {
  assert.match(source, /const updated = await updateAuthUser\(editingId/);
  assert.match(source, /shouldAssignDelegateSales/);
  assert.match(source, /savedUser = await updateAuthUserDepartmentAssignments/);
});
