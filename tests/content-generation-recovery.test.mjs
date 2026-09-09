import assert from "node:assert/strict";
import test from "node:test";
import { validateRecoveryLimits, RECOVERY_REASON_LABELS } from "../lib/contentGenerationRecovery.ts";

const recovery = {
  canContinue: true, reasons: ["token_limit"], blockedReason: null,
  currentLimits: { tokenLimit: 2000000, requestLimit: 1192, costLimitUsd: 14.9 },
  maximumLimits: { tokenLimit: 2000000000000, requestLimit: 2500000, costLimitUsd: 10000 },
};
const usage = { totalTokens: 2000100, requests: 558, estimatedCostUsd: 1.82 };
const proposed = { tokenLimit: 5000000, requestLimit: 1192, costLimitUsd: 14.9 };

test("recovery accepts increased tokens while keeping the other allowances", () => {
  assert.equal(validateRecoveryLimits(proposed, recovery, usage), null);
  assert.equal(RECOVERY_REASON_LABELS.token_limit, "Token allowance reached");
});
for (const [key, value] of [["tokenLimit", 2000100], ["tokenLimit", NaN], ["tokenLimit", Infinity],
  ["requestLimit", 1191], ["requestLimit", 1192.5], ["costLimitUsd", 1], ["costLimitUsd", 10001]]) {
  test(`recovery rejects invalid ${key}=${value}`, () => {
    assert.ok(validateRecoveryLimits({ ...proposed, [key]: value }, recovery, usage));
  });
}
test("recovery blocks a leased or incomplete run", () => {
  assert.equal(validateRecoveryLimits(proposed, { ...recovery, canContinue: false, blockedReason: "Worker still active" }, usage), "Worker still active");
});
test("projected cost stops require additional cost headroom", () => {
  assert.match(validateRecoveryLimits(proposed, { ...recovery, reasons: ["projected_cost_limit"] }, usage), /cost limit/);
});
test("unknown budget stops cannot be continued with unchanged limits", () => {
  assert.match(validateRecoveryLimits(recovery.currentLimits, { ...recovery, reasons: ["budget_limit"] }, { ...usage, totalTokens: 1000000 }), /Increase a budget/);
});
test("manually paused runs can continue with their existing budgets", () => {
  assert.equal(validateRecoveryLimits(recovery.currentLimits, { ...recovery, reasons: ["user_pause"] }, { ...usage, totalTokens: 1000000 }), null);
});
