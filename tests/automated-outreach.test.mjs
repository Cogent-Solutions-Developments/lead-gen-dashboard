import assert from "node:assert/strict";
import test from "node:test";
import { outreachActions, OUTREACH_DEPARTMENTS, statusLabel } from "../lib/automatedOutreach.ts";

test("only the requested departments are available", () => {
  assert.deepEqual(OUTREACH_DEPARTMENTS.map((department) => department.key), ["sales", "delegate", "production"]);
});

test("terminal lead states never offer restart or resend actions", () => {
  for (const state of ["stopped", "opted_out", "replied", "bounced", "completed"]) {
    assert.deepEqual(outreachActions({ state, email: "lead@example.com", messages: [] }), state === "opted_out" ? [] : ["opt_out"]);
  }
});

test("paused leads can resume and missing email does not offer an ineffective opt out", () => {
  assert.deepEqual(outreachActions({ state: "paused", email: null, messages: [] }), ["resume", "stop"]);
  assert.deepEqual(outreachActions({ state: "active", email: "lead@example.com", messages: [] }), ["pause", "stop", "opt_out"]);
});

test("retry is offered only for content failures before provider handoff", () => {
  assert.ok(outreachActions({ state: "failed", email: null, messages: [{ status: "failed", subject: null }] }).includes("retry"));
  assert.ok(!outreachActions({ state: "attention", email: null, messages: [{ status: "uncertain", subject: "Follow up" }] }).includes("retry"));
  assert.ok(!outreachActions({ state: "failed", email: null, messages: [{ status: "failed", subject: "Follow up" }] }).includes("retry"));
});

test("workflow keys and outreach states produce readable labels", () => {
  assert.equal(statusLabel("proposal-sent"), "Proposal Sent");
  assert.equal(statusLabel("opted_out"), "Opted Out");
});
