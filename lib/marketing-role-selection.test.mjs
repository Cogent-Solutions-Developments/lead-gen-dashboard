import assert from "node:assert/strict";
import test from "node:test";
import {
  secondaryDepartmentsForRoles,
  incompatibleRoleSelection,
} from "./marketing-role-selection.ts";

test("legacy plus manager and social survive form serialization", () => {
  assert.deepEqual(
    secondaryDepartmentsForRoles(
      ["marketing_user", "marketing_manager_user"],
      [],
      true,
    ),
    ["marketing_manager_user", "marketing_social"],
  );
});
test("manager can also design and develop without duplicating the primary role", () => {
  assert.deepEqual(
    secondaryDepartmentsForRoles([
      "marketing_manager_user",
      "marketing_designer_user",
      "marketing_developer_user",
    ]),
    ["marketing_designer_user", "marketing_developer_user"],
  );
});
test("social responsibility can be revoked while autocall is preserved", () => {
  assert.deepEqual(
    secondaryDepartmentsForRoles(
      ["marketing_user", "marketing_manager_user"],
      ["marketing_social", "autocall"],
      false,
    ),
    ["autocall", "marketing_manager_user"],
  );
});
test("existing pipeline assignments remain compatible", () => {
  assert.deepEqual(
    secondaryDepartmentsForRoles(
      ["production_manager_user", "delegate_user", "marketing_designer_user"],
      ["autocall"],
    ),
    ["autocall", "delegate", "marketing_designer_user"],
  );
  assert.equal(
    incompatibleRoleSelection([
      "production_manager_user",
      "delegate_user",
      "marketing_designer_user",
    ]),
    false,
  );
});
test("unsupported combinations are rejected instead of silently dropping roles", () => {
  assert.equal(incompatibleRoleSelection(["marketing_user", "ceo_user"]), true);
  assert.equal(
    incompatibleRoleSelection(["client_user", "marketing_manager_user"]),
    true,
  );
  assert.equal(
    incompatibleRoleSelection(["marketing_user", "marketing_manager_user"]),
    false,
  );
  assert.deepEqual(
    secondaryDepartmentsForRoles(["client_user"], ["autocall"], true),
    [],
  );
});
