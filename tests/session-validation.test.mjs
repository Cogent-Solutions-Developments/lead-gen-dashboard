import { it } from "node:test";
import assert from "node:assert/strict";
import { validateSessionOnReload } from "../lib/session-validation.ts";

it("keeps the session through consecutive rate limits, outages, and network failures", async () => {
  let invalidations = 0;
  for (const error of [{status:429}, {status:503}, new TypeError("Failed to fetch"), {status:500}, {status:403}, new Error("Invalid response")]) {
    assert.equal(await validateSessionOnReload({
      refresh: async () => { throw error; },
      isCurrent: () => true,
      invalidate: () => { invalidations++; },
    }), "unavailable");
  }
  assert.equal(invalidations, 0);
  assert.equal(await validateSessionOnReload({
    refresh: async () => ({}), isCurrent: () => true,
    invalidate: () => { invalidations++; },
  }), "valid");
  assert.equal(invalidations, 0);
});

it("invalidates a session only when the current login is rejected with 401", async () => {
  let invalidations = 0;
  assert.equal(await validateSessionOnReload({
    refresh: async () => { throw {status:401}; }, isCurrent: () => true,
    invalidate: () => { invalidations++; },
  }), "invalid");
  assert.equal(invalidations, 1);
});

it("ignores old authentication failures after another login or unmount", async () => {
  let invalidations = 0;
  assert.equal(await validateSessionOnReload({
    refresh: async () => { throw {status:401}; }, isCurrent: () => false,
    invalidate: () => { invalidations++; },
  }), "superseded");
  assert.equal(invalidations, 0);
});
