import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAccessAutocall, autocallBaseUrl } from "../lib/autocall-access.ts";
describe("Autocall access", () => {
  it("permits assigned employees and admins; excludes unassigned, inactive, and client accounts", () => {
    assert.equal(canAccessAutocall({role:"sales_user", departmentAssignments:["delegate_sales", "autocall"]}), true);
    assert.equal(canAccessAutocall({role:"super_admin_user"}), true);
    for (const user of [null, {role:"sales_user"}, {role:"client_user", departmentAssignments:["autocall"]}, {role:"sales_user", isActive:false, departmentAssignments:["autocall"]}]) assert.equal(canAccessAutocall(user),false);
  });
  it("rejects unsafe or mismatched redirect configuration", () => {
    assert.equal(autocallBaseUrl("https://app.example/autocall-db").pathname, "/autocall-db");
    for (const url of ["http://app.example/autocall-db", "https://user:pass@app.example/autocall-db", "https://app.example/", "https://app.example/autocall-db?next=evil"]) assert.throws(() => autocallBaseUrl(url));
  });
});

it("allows loopback HTTP only with the development opt-in", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const url = `http://${host}:3001/autocall-db`;
    assert.equal(autocallBaseUrl(url, true).href, url);
    assert.throws(() => autocallBaseUrl(url));
  }
  for (const url of ["http://localhost.evil.example/autocall-db", "http://192.168.1.1/autocall-db", "http://example.com/autocall-db", "http://localhost:3001/autocall-db?next=evil"]) {
    assert.throws(() => autocallBaseUrl(url, true));
  }
  assert.throws(() => autocallBaseUrl(""), /Set AUTOCALL_PUBLIC_URL/);
});
