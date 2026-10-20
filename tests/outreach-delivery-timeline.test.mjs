import assert from "node:assert/strict";
import test from "node:test";
import { outreachDeliverySteps } from "../lib/outreachDeliveryTimeline.ts";

const lead = {state:"active",sentCount:0,nextDueAt:"2026-10-24T10:00:00Z",messages:[]};
const message = {step:1,status:"accepted",tracking:{},updatedAt:"2026-10-20T10:00:00Z"};

test("only the next unsent email gets a scheduled date", () => {
  const steps = outreachDeliverySteps(lead);
  assert.equal(steps.length,3);
  assert.equal(steps[0].state,"Scheduled");
  assert.equal(steps[0].date,lead.nextDueAt);
  assert.equal(steps[1].state,"Waiting");
  assert.equal(steps[1].date,null);
});
test("Make acceptance does not count as a send or use the update time as a send date", () => {
  const [step] = outreachDeliverySteps({...lead,messages:[message]});
  assert.equal(step.state,"Awaiting confirmation");
  assert.equal(step.confirmed,false);
  assert.equal(step.date,null);
});
test("confirmed delivery uses its recorded timestamp and schedules the next email", () => {
  const delivered = {...message,status:"delivered",tracking:{sentAt:"2026-10-20T10:00:00Z",deliveredAt:"2026-10-20T10:01:00Z"}};
  const steps = outreachDeliverySteps({...lead,sentCount:1,messages:[delivered]});
  assert.equal(steps[0].confirmed,true);
  assert.equal(steps[0].state,"Delivered");
  assert.equal(steps[0].date,delivered.tracking.deliveredAt);
  assert.equal(steps[1].state,"Scheduled");
});
test("paused, stopped and uncertain emails do not show misleading scheduled sends", () => {
  assert.equal(outreachDeliverySteps({...lead,state:"paused"})[0].state,"Paused");
  assert.equal(outreachDeliverySteps({...lead,state:"stopped"})[0].state,"Not scheduled");
  const [uncertain] = outreachDeliverySteps({...lead,messages:[{...message,status:"uncertain"}]});
  assert.equal(uncertain.needsAttention,true);
  assert.equal(uncertain.confirmed,false);
  assert.equal(uncertain.date,null);
});
test("saved previews remain unsent while retaining the next scheduled date", () => {
  const steps=outreachDeliverySteps({...lead,messages:[{...message,status:"preview",subject:"Preview",body:"Body"}]});
  assert.equal(steps[0].state,"Content ready");
  assert.equal(steps[0].confirmed,false);
  assert.equal(steps[0].date,lead.nextDueAt);
  assert.equal(steps[0].scheduled,true);
});
