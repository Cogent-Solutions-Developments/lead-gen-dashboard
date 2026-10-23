import assert from "node:assert/strict";
import test from "node:test";
import { outreachContentStates } from "../lib/outreachContentStatus.ts";

test("content status always has three ordered slots", () => {
  assert.deepEqual(outreachContentStates([]), ["pending", "pending", "pending"]);
  assert.deepEqual(outreachContentStates([{step:3,status:"preview_failed"},{step:1,status:"preview",subject:"Hello",body:"Message"},{step:2,status:"preview_queued"}]), ["complete", "processing", "failed"]);
});
test("generation states reflect work in progress and require complete content", () => {
  for (const status of ["preview_queued", "preview_generating", "generating"]) {
    assert.equal(outreachContentStates([{step:1,status,subject:"Old",body:"Old"}])[0], "processing");
  }
  assert.equal(outreachContentStates([{step:1,status:"preview",subject:"Hello",body:"  "}])[0], "pending");
  assert.equal(outreachContentStates([{step:1,status:"failed"}])[0], "failed");
});
test("delivery failures do not mark generated content as failed", () => {
  for (const status of ["failed", "bounced", "uncertain", "sent", "preview"]) {
    assert.equal(outreachContentStates([{step:1,status,subject:"Hello",body:"Message"}])[0], "complete");
  }
});
