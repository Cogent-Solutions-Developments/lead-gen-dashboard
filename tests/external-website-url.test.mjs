import assert from "node:assert/strict";
import test from "node:test";
import { getExternalWebsiteUrl } from "../lib/externalWebsiteUrl.ts";

test("company website domains open as absolute web URLs", () => {
  assert.equal(getExternalWebsiteUrl("xogentsolutions.ae"), "https://xogentsolutions.ae/");
  assert.equal(getExternalWebsiteUrl("www.example.com/about"), "https://www.example.com/about");
  assert.equal(getExternalWebsiteUrl("https://example.com/contact"), "https://example.com/contact");
  assert.equal(getExternalWebsiteUrl("http://example.com"), "http://example.com/");
});

test("missing or unsafe website values are not links", () => {
  for (const value of [null, "", "-", "N/A", "/campaigns/example", "javascript:alert(1)", "mailto:hello@example.com", "https://example.com@evil.test", "localhost:3000"]) {
    assert.equal(getExternalWebsiteUrl(value), null);
  }
});
