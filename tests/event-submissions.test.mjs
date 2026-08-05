import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/event-submissions/page.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../lib/eventSubmissionsApi.ts", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");
const adminSidebar = readFileSync(
  new URL("../components/layout/AdminPanelShell.tsx", import.meta.url),
  "utf8"
);
const adminPage = readFileSync(
  new URL("../app/admin/event-submissions/page.tsx", import.meta.url),
  "utf8"
);
const rootLayout = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8"
);
const dateFilters = await import(
  new URL("../lib/eventSubmissionFilters.ts", import.meta.url).href
);

test("event submissions live inside the admin panel for super admins", () => {
  assert.match(adminSidebar, /name:\s*"Event Submissions"/);
  assert.match(adminSidebar, /href:\s*"\/admin\/event-submissions"/);
  assert.match(adminPage, /<EventSubmissionsPage \/>/);
  assert.match(page, /router\.replace\("\/admin\/event-submissions"\)/);
});

test("shared admin styling survives a refresh on the workspace route", () => {
  assert.match(rootLayout, /import "\.\/admin\/admin-ui\.css"/);
});

test("CEO and manager access stays in the normal workspace navigation", () => {
  assert.match(sidebar, /submissionViewerOnly:\s*true/);
  assert.match(sidebar, /!isSuperAdmin && \(isCeo \|\| isManager\)/);
  assert.match(page, /isAdminLike \|\| isManagerRole\(user\?\.role\)/);
});

test("dashboard uses the secured overview, list, and detail endpoints", () => {
  assert.match(api, /\/api\/manager\/event-submissions\/overview/);
  assert.match(api, /"\/api\/manager\/event-submissions"/);
  assert.match(api, /\/api\/manager\/event-submissions\/\$\{encodeURIComponent\(submissionId\)\}/);
});

test("registration categories and sponsor interests remain distinct", () => {
  assert.match(page, /categoryValue:\s*categoryFilter\?\.value/);
  assert.match(page, /interestedValue:\s*sponsorFilter\?\.value/);
  assert.match(page, /Registration category/);
  assert.match(page, /Sponsor interest/);
  assert.match(page, /selectionSummary\(submission\)/);
});

test("submission details hide developer-only metadata", () => {
  assert.doesNotMatch(page, /Original frontend data/);
  assert.doesNotMatch(page, />Submission ID</);
  assert.doesNotMatch(page, />Source system</);
  assert.doesNotMatch(page, />Source record</);
  assert.doesNotMatch(page, /humanizeKey\(submission\.event\.matchStatus\)/);
});

test("submitted date filters use the full local calendar day", () => {
  const start = new Date(dateFilters.submittedDayStart("2026-06-04"));
  const end = new Date(dateFilters.submittedDayEnd("2026-06-04"));

  assert.deepEqual(
    [start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()],
    [2026, 5, 4, 0, 0]
  );
  assert.deepEqual(
    [end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()],
    [2026, 5, 4, 23, 59, 59, 999]
  );
  assert.equal(dateFilters.submittedDayStart(""), undefined);
  assert.equal(dateFilters.submittedDayEnd("2026-02-30"), undefined);
});

test("browse groups stay complete while submitted dates filter the results", () => {
  assert.match(page, /fetchEventSubmissionOverview\(\{\}, controller\.signal\)/);
  assert.match(page, /browseOverview\.eventClusters/);
  assert.match(page, /submittedFrom:\s*submittedDayStart\(fromDate\)/);
  assert.match(page, /submittedTo:\s*submittedDayEnd\(toDate\)/);
  assert.match(page, /aria-label="Submitted from"/);
  assert.match(page, /aria-label="Submitted to"/);
});

test("browse and filters share one submissions workspace", () => {
  const workspaces = page.match(/<section className="admin-card mt-5 overflow-hidden">/g) || [];
  assert.equal(workspaces.length, 1);
  assert.match(page, /Toggle browse and filters/);
  assert.match(page, /setClusterView\(tab\.id\); setFiltersOpen\(true\)/);
});
