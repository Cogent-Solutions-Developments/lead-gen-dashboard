import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as operations from "../lib/systemOperations.ts";

const incident = (overrides = {}) => ({
  code: "stale_content_lock",
  severity: "warning",
  message: "technical message",
  campaignId: "campaign-1",
  pipeline: "sales",
  doneTotal: 25,
  targetTotal: 100,
  locks: { contentInProgress: true, batchInProgress: false },
  recommendedActions: ["unlock-content", "trigger-content-catchup"],
  ...overrides,
});

test("operation summaries count campaigns, locks, checks and log sources without duplicates", () => {
  const incidents = [
    incident(),
    incident({
      code: "stale_progress",
      locks: { contentInProgress: true, batchInProgress: true },
    }),
    incident({
      campaignId: "campaign-2",
      pipeline: "delegate",
      recommendedActions: ["trigger-profile-dispatcher"],
    }),
  ];
  assert.equal(operations.countCampaigns(incidents), 2);
  assert.equal(operations.countLockedWorkflows(incidents), 3);
  assert.equal(operations.countSafeChecks(incidents), 3);
  assert.equal(
    operations.countAvailableLogs([
      { exists: true },
      { exists: false },
      { exists: true },
    ]),
    2,
  );
  assert.deepEqual(
    operations.incidentsByPipeline(incidents).map(({ campaigns }) => campaigns),
    [1, 1, 0],
  );
});

test("progress is clamped and unknown totals remain unavailable", () => {
  assert.equal(operations.progressPercentage(25, 100), 25);
  assert.equal(operations.progressPercentage(120, 100), 100);
  assert.equal(operations.progressPercentage(-4, 100), 0);
  assert.equal(operations.progressPercentage(4, 0), null);
});

test("logs can be reduced to understandable warning and error signals", () => {
  const lines = [
    "worker ready",
    "WARNING retry scheduled",
    "Traceback: failed",
    "ERROR provider failed",
  ];
  assert.deepEqual(operations.filterLogLines(lines, "warning"), [
    "WARNING retry scheduled",
  ]);
  assert.deepEqual(operations.filterLogLines(lines, "error"), [
    "Traceback: failed",
    "ERROR provider failed",
  ]);
  assert.equal(operations.filterLogLines(lines, "all").length, 4);
});

test("incident language and timestamps are human readable", () => {
  assert.equal(
    operations.incidentExplanation("stale_progress").title,
    "Campaign progress has stopped updating",
  );
  assert.equal(
    operations.actionDetails("unlock-content").label,
    "Release content hold",
  );
  assert.equal(
    operations.formatRelativeTime(
      "2026-09-04T11:30:00Z",
      Date.parse("2026-09-04T12:00:00Z"),
    ),
    "Updated 30 minutes ago",
  );
});

test("operations UI keeps safe checks primary and protects real recovery", () => {
  const source = readFileSync(
    new URL("../components/settings/SystemOperations.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Operations Center/);
  assert.match(source, /Run safe check/);
  assert.match(source, /I understand this changes only this campaign/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /Advanced service logs/);
  assert.match(
    readFileSync(
      new URL("../lib/systemOperations.ts", import.meta.url),
      "utf8",
    ),
    /callback_worker/,
  );
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /dockerData\.available !== false/);
  assert.match(source, /dockerData\.enabled === false/);
  assert.match(source, /dockerLogsIntentionallyDisabled\s*\? null/);
  assert.doesNotMatch(source, /throw new Error\(data\.error\)/);
  assert.match(source, /listSystemOperationLogServices\("file"\)/);
  assert.match(source, /Showing application file logs instead/);
  assert.match(
    source,
    /buildSystemOperationLogStreamUrl\(service, 1, logSource\)/,
  );
  assert.doesNotMatch(source, /Service Selector/);
});
