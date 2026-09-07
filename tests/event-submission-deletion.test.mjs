import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { canDeleteEventInquiry, isInquiryDeleteConfirmed } = await import(
  new URL("../lib/eventSubmissionDeletion.ts", import.meta.url).href
);
const page = readFileSync(new URL("../app/event-submissions/page.tsx", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../components/event-submissions/DeleteEventInquiryDialog.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../lib/eventSubmissionsApi.ts", import.meta.url), "utf8");

test("delete controls are exclusive to the super-admin inquiries page", () => {
  assert.equal(canDeleteEventInquiry(true, "/admin/event-submissions"), true);
  assert.equal(canDeleteEventInquiry(false, "/admin/event-submissions"), false);
  for (const route of ["/event-submissions", "/admin", "/settings", "/admin/event-submissions/other"]) {
    assert.equal(canDeleteEventInquiry(true, route), false);
    assert.equal(canDeleteEventInquiry(false, route), false);
  }
  assert.match(page, /canDeleteEventInquiry\(isSuperAdmin, pathname\)/);
  assert.match(page, /canDelete && deleteTarget/);
});

test("confirmation requires the deliberate exact phrase, without normalization", () => {
  assert.equal(isInquiryDeleteConfirmed("DELETE"), true);
  for (const value of ["", "delete", "Delete", "DELETE ", " DELETE", "YES", "DELETE\n"]) {
    assert.equal(isInquiryDeleteConfirmed(value), false);
  }
});

test("confirmation dialog defaults to Cancel and blocks unconfirmed or duplicate submits", () => {
  assert.match(dialog, /dialog\.showModal\(\)/);
  assert.match(dialog, /cancelRef\.current\?\.focus\(\)/);
  assert.match(dialog, /disabled=\{busy \|\| !isInquiryDeleteConfirmed\(confirmation\)\}/);
  assert.match(dialog, /aria-labelledby="delete-inquiry-title"/);
  assert.match(dialog, /aria-describedby="delete-inquiry-description"/);
  assert.match(dialog, /if \(!busy\) onCancel\(\)/);
  assert.doesNotMatch(dialog, /<form/);
  assert.match(page, /mutationInFlight\.current/);
  assert.match(dialog, /submission\.event\.eventName/);
  assert.match(dialog, /submission\.contact\.workEmail/);
});

test("delete binds confirmation to the exact inquiry and Undo binds to the deletion version", () => {
  assert.match(api, /\/api\/admin\/event-submissions\/\$\{encodeURIComponent\(submissionId\)\}/);
  assert.match(api, /data: \{ submissionId, confirmation \}/);
  assert.match(api, /\/restore/);
  assert.match(api, /\{ deletedAt \}/);
  assert.match(page, /restoreEventSubmission\(lastDeleted\.id, lastDeleted\.deletedAt\)/);
  assert.match(page, /Undo deletion/);
});

test("deletion keeps pagination valid and exposes the action on desktop and mobile", () => {
  assert.match(page, /setOffset\(lastPageOffset\)/);
  assert.equal((page.match(/deleteAction\(submission\)/g) || []).length, 2);
  assert.match(page, /setItems\(\(current\) => current\.filter/);
});
