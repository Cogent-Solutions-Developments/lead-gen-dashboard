import { it } from "node:test";
import assert from "node:assert/strict";
import { validateSessionOnReload, watchSessionValidation } from "../lib/session-validation.ts";

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

it("refreshes open sessions on a timer, tab return and reconnection, with cleanup", async () => {
  const host = new EventTarget();
  const visibility = Object.assign(new EventTarget(), {visibilityState: "visible"});
  let tick = () => {};
  let cleared = false;
  Object.assign(host, {setInterval(fn, delay) { assert.equal(delay, 15000); tick = fn; return 1; }, clearInterval() {cleared = true;} });
  let calls = 0;
  let release;
  const stop = watchSessionValidation(async () => {calls++; await new Promise(resolve => {release = resolve;});}, host, visibility);
  assert.equal(calls, 1);
  tick(); host.dispatchEvent(new Event("focus"));
  assert.equal(calls, 1, "requests must not overlap");
  release(); await new Promise(resolve => setTimeout(resolve, 0));
  tick(); assert.equal(calls, 2);
  release(); await new Promise(resolve => setTimeout(resolve, 0));
  visibility.dispatchEvent(new Event("visibilitychange")); assert.equal(calls, 3);
  release(); await new Promise(resolve => setTimeout(resolve, 0));
  host.dispatchEvent(new Event("online")); assert.equal(calls, 4);
  release(); await new Promise(resolve => setTimeout(resolve, 0));
  host.dispatchEvent(new Event("focus")); assert.equal(calls, 5);
  stop(); release(); await new Promise(resolve => setTimeout(resolve, 0));
  tick(); host.dispatchEvent(new Event("focus")); visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(calls, 5); assert.equal(cleared, true);
});
