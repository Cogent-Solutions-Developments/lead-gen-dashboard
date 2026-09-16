import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendAutocallTarget,
  autocallIncomingCallHref,
  autocallNotificationHref,
  autocallTargetFromSearchParams,
} from "../lib/autocall-deep-link.ts";

const target = { siteId: "site_123", visitorId: "visitor_123", threadId: "thread_123" };

describe("Autocall notification deep links", () => {
  it("builds a local SSO launch URL from notification identifiers", () => {
    assert.equal(
      autocallNotificationHref(target),
      "/autocall?siteId=site_123&visitorId=visitor_123&threadId=thread_123"
    );
  });

  it("preserves validated identifiers on an Autocall URL", () => {
    const url = appendAutocallTarget(new URL("https://app.test/sso/start?portal=light"), target);
    assert.deepEqual(autocallTargetFromSearchParams(url.searchParams), target);
  });

  it("builds and preserves a validated incoming-call link", () => {
    const href = autocallIncomingCallHref({ callId: "call_123" });
    assert.equal(href, "/autocall?callId=call_123");
    assert.deepEqual(autocallTargetFromSearchParams(new URL(href, "https://app.test").searchParams), {
      callId: "call_123",
    });
    const url = appendAutocallTarget(new URL("https://app.test/sso/start"), { callId: "call_123" });
    assert.equal(url.searchParams.get("callId"), "call_123");
  });

  it("rejects partial, malformed, and arbitrary redirect data", () => {
    assert.throws(() => autocallNotificationHref({ siteId: "site_123" }));
    assert.throws(() => autocallIncomingCallHref({ callId: "../admin" }));
    assert.throws(() =>
      autocallTargetFromSearchParams(
        new URLSearchParams({ siteId: "../admin", visitorId: "visitor_123", threadId: "thread_123" })
      )
    );
    assert.equal(autocallTargetFromSearchParams(new URLSearchParams("next=https://evil.test")), null);
  });
});
