import assert from "node:assert/strict";
import test from "node:test";
import { campaignShare, emailStages, eventInsights } from "../lib/eventOutreach.ts";

const totals = { sentEmailCount: 12, contactedLeadCount: 4, campaignCount: 2, initialEmailCount: 5, followUpEmailCount: 7, firstFollowUpEmailCount: 2, secondFollowUpEmailCount: 2, thirdFollowUpEmailCount: 1, finalFollowUpEmailCount: 1 };
const day = (date, sent, followUps) => ({ date, sentEmailCount: sent, contactedLeadCount: 2, campaignCount: 1, followUpEmailCount: followUps });

test("daily chart segments partition sent emails without counting follow-ups twice", () => {
  const result = eventInsights(totals, [day("2026-10-01", 8, 5), day("2026-10-02", 4, 2)]);
  assert.deepEqual(result.dailyActivity.map(d => d.initialEmailCount), [3, 2]);
  assert.equal(result.dailyActivity.reduce((sum, d) => sum + d.initialEmailCount + d.followUpEmailCount, 0), totals.sentEmailCount);
  assert.equal(result.emailsPerLead, 3);
});

test("insights use the latest sending day and deterministic earliest peak on ties", () => {
  const days = [day("2026-10-03", 0, 0), day("2026-10-02", 6, 4), day("2026-10-01", 6, 3)];
  const result = eventInsights(totals, days);
  assert.equal(result.lastSendDay, "2026-10-02");
  assert.equal(result.busiestDay.date, "2026-10-01");
  assert.equal(days[0].date, "2026-10-03");
});

test("missing leads and zero sends render absent insights rather than misleading zeros or infinities", () => {
  const result = eventInsights({ ...totals, sentEmailCount: 0, contactedLeadCount: 0 }, [day("2026-10-01", 0, 0)]);
  assert.equal(result.emailsPerLead, null);
  assert.equal(result.busiestDay, null);
  assert.equal(result.lastSendDay, null);
  assert.equal(campaignShare(0, 0), 0);
});

test("unknown follow-up stages stay visible and the stage sum matches sends", () => {
  const stages = emailStages(totals);
  assert.equal(stages.at(-1).label, "Other follow-ups");
  assert.equal(stages.at(-1).value, 1);
  assert.equal(stages.reduce((sum, s) => sum + s.value, 0), totals.sentEmailCount);
  assert.equal(emailStages({ ...totals, followUpEmailCount: 6 }).length, 5);
  assert.equal(campaignShare(3, 12), 25);
});
