import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/campaigns/[id]/page.tsx", import.meta.url), "utf8");
const leadRows = page.slice(page.indexOf("paginatedLeads.map((item, index) =>"), page.indexOf("</tbody>"));

test("lead-sheet warning labels use accessible icons and a visible legend", () => {
  assert.match(page, /aria-label="Lead indicator legend"/);
  assert.match(leadRows, /role="img" aria-label="Suppressed lead" title="Suppressed lead"/);
  assert.match(leadRows, /role="img" aria-label="Lead actions blocked" title="Lead actions blocked"/);
  assert.match(leadRows, /role="img" aria-label="Lead not sendable" title="Lead not sendable"/);
  assert.doesNotMatch(leadRows, />\s*(?:Suppressed|Blocked|Not Sendable)\s*</);
});

test("primary status and review details remain readable", () => {
  assert.match(leadRows, /\{mailStatus\.label\}/);
  assert.match(leadRows, /\{item\.approvalStatus\}/);
  assert.match(leadRows, /\{mailStatus\.subtitle\}/);
  assert.match(leadRows, /Review: \{item\.reviewStatus\}/);
});
