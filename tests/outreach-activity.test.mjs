import assert from "node:assert/strict";
import test from "node:test";
import { describeOutreachActivity } from "../lib/outreachActivity.ts";

const entry = {id:"audit",enrollmentId:"lead",actor:"92d3b21a-a831-4edc-a799-d98a444b1a97",details:{},createdAt:"2026-10-20T00:00:00Z"};
test("activity explains admin actions without exposing actor IDs in the summary", () => {
  const activity = describeOutreachActivity({...entry,action:"admin_pause"});
  assert.equal(activity.title,"Outreach paused");
  assert.equal(activity.actor,"Administrator");
  assert.match(activity.description,/future emails/);
});
test("accepted handoff is clearly distinguished from a confirmed send", () => {
  const accepted=describeOutreachActivity({...entry,action:"handoff_accepted",actor:"system",details:{step:2}});
  assert.match(accepted.description,/confirmation is still pending/);
  assert.equal(accepted.step,2);
  const sent=describeOutreachActivity({...entry,action:"provider_sent",actor:"provider"});
  assert.equal(sent.title,"Email sent");
  assert.equal(sent.actor,"Delivery service");
});
test("unknown activity is neutral and optional details are type checked", () => {
  const activity=describeOutreachActivity({...entry,action:"future_event",details:{step:9,reason:{private:"value"},webhookName:"Status mail"}});
  assert.equal(activity.title,"Outreach activity recorded");
  assert.equal(activity.step,null);
  assert.equal(activity.reason,null);
  assert.equal(activity.webhook,"Status mail");
});