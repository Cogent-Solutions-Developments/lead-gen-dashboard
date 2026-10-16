import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../app/admin/users/page.tsx", import.meta.url), "utf8");
const rolePicker = fs.readFileSync(new URL("../components/admin/UserRoleMultiSelect.tsx", import.meta.url), "utf8");

test("Delegate Sales is managed inside the update-user role selection", () => {
  assert.match(source, /<UserRoleMultiSelect/);
  assert.match(rolePicker, /type="checkbox"/);
  assert.match(rolePicker, /checked=\{selected\}/);
  assert.match(source, /Department roles/);
  assert.doesNotMatch(source, /Assign Delegate Sales/);
  assert.doesNotMatch(source, /onToggleDelegateSales/);
});

test("saving an edited user persists the primary and Delegate Sales selections", () => {
  assert.match(source, /(?:const|let) updated = await updateAuthUser\(editingId/);
  assert.match(source, /selectedRoles/);
  assert.match(source, /departmentAssignments: secondaryDepartmentsForRoles/);
});
