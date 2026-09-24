import assert from "node:assert/strict";
import test from "node:test";
import { getLinkedinProfileUrl } from "../lib/linkedinProfileUrl.ts";

test("LinkedIn profile links require a real LinkedIn URL", () => {
  for (const value of [null, undefined, "", "  ", "-", "N/A", "/campaigns/example", "https://example.com/in/person", "https://linkedin.com.evil.test/in/person", "javascript:alert(1)", "https://linkedin.com/"]) {
    assert.equal(getLinkedinProfileUrl(value), null);
  }

  assert.equal(getLinkedinProfileUrl("https://www.linkedin.com/in/person"), "https://www.linkedin.com/in/person");
  assert.equal(getLinkedinProfileUrl("www.linkedin.com/in/person"), "https://www.linkedin.com/in/person");
});
