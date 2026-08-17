import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("duplicate event rows merge into one card while retaining provenance", async () => {
  const { mergeDuplicateEventLeadRows } = await import(
    pathToFileURL(resolve(root, "lib/leads/mergeEventLeadRows.ts")).href
  );
  const base = {
    canonicalEventKey: "event-1",
    employeeName: "Jane Doe",
    title: "CEO",
    company: "Acme",
    email: "jane@example.com",
    phone: "",
    linkedinUrl: "",
    companyUrl: "",
    category: "Technology",
    isManualLead: false,
    manualLeadAddedByUsername: "",
    primaryDepartment: "sales",
    departments: ["sales"],
    departmentTags: [{ department: "sales", label: "Sales" }],
    owners: [],
    originHistory: [],
    ownershipCount: 1,
    isSuppressed: false,
    contactReadOnly: false,
  };
  const rows = [
    { ...base, id: "lead-1", mergedLeadIds: ["lead-1"], leadIdentityKey: "identity-a", originSources: [{ sourceType: "cs_database", label: "CS Database" }] },
    { ...base, id: "lead-2", mergedLeadIds: ["lead-2"], leadIdentityKey: "identity-b", originSources: [{ sourceType: "user_upload", ownerUsername: "sasan", label: "Sasan's Leads" }] },
  ];
  const merged = mergeDuplicateEventLeadRows(rows);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].mergedLeadIds, ["lead-1", "lead-2"]);
  assert.equal(merged[0].originSources.length, 2);
});

test("lead creation and uploads require explicit event provenance", () => {
  const page = read("app/my-leads/page.tsx");
  const api = read("lib/api.ts");
  assert.match(page, /eventRegistryId: selectedAddLeadEvent\.id/);
  assert.match(page, /<SelectValue placeholder=\{loadingRegistryEvents/);
  assert.match(page, /validateMyLeadTemplateUpload\(file, templateUpload\.selectedEventId\)/);
  assert.match(api, /formData\.append\("eventRegistryId", eventRegistryId\.trim\(\)\)/);
});

test("the Add Lead dialog fits the desktop viewport without internal scrolling", () => {
  const page = read("app/my-leads/page.tsx");
  assert.match(page, /fitViewport \? "overflow-hidden px-6 pb-5"/);
  assert.match(page, /fitViewport\s*\n\s*>\s*\n\s*<div className="grid gap-x-8 gap-y-4/);
  assert.match(page, /ADD_LEAD_INPUT_CLASS = "h-10/);
  assert.match(page, /<div className="mt-5 flex items-center justify-between">/);
});

test("lead row status actions stay on one line inside the row boundary", () => {
  const myLeads = read("app/my-leads/page.tsx");
  const sharedLeadSheet = read("components/leads/NormalUserEventLeadSheet.tsx");
  for (const source of [myLeads, sharedLeadSheet]) {
    assert.match(source, /minmax\(14rem,0\.95fr\)_19rem/);
    assert.match(source, /flex flex-nowrap items-center gap-x-1\.5/);
    assert.match(source, /shrink-0 items-center gap-1 whitespace-nowrap/);
  }
});

test("deal-close revenue and source/status histories are wired through the frontend", () => {
  const myLeads = read("app/my-leads/page.tsx");
  const normalLeads = read("components/leads/NormalUserEventLeadSheet.tsx");
  const history = read("components/leads/LeadHistoryContent.tsx");
  for (const source of [myLeads, normalLeads]) {
    assert.match(source, /Deal amount \(USD\) \*/);
    assert.match(source, /normalizedDealAmount/);
    assert.match(source, /Source timeline/);
  }
  assert.match(history, /workflowHistoryAttributionText/);
  assert.match(history, /formatUsd\(entry\.dealAmountUsd\)/);
});

test("manager performance is period-aware and omits inactive users", () => {
  const page = read("app/manager/user-performance/page.tsx");
  const adminPage = read("app/admin/user-performance/page.tsx");
  const adminApi = read("app/admin/admin-api.ts");
  const helper = read("lib/managerPerformance.ts");
  const picker = read("components/performance/PeriodDatePicker.tsx");
  assert.match(page, /activePerformanceSummary\(data\)/);
  assert.match(page, /revenueUsd=\{selectedRevenueUsd\}/);
  assert.match(helper, /user\.isActive !== false/);
  assert.match(picker, /period === "weekly" \? "week"/);
  assert.match(picker, /anchorDateForPeriod/);
  assert.match(adminPage, /<PeriodDatePicker period=\{period\}/);
  assert.match(adminPage, /formatUsd\(selectedCluster\.revenueUsd\)/);
  assert.match(adminApi, /dealAmountUsd: activity\.dealAmountUsd/);
  assert.match(adminApi, /revenueUsd: Number\(data\.summary\?\.revenueUsd/);
});

test("performance charts show only KPI and revenue and preserve dates across period switches", () => {
  const managerPage = read("app/manager/user-performance/page.tsx");
  const adminPage = read("app/admin/user-performance/page.tsx");

  assert.match(managerPage, /dataKey="KPI"/);
  assert.match(managerPage, /dataKey="Revenue"/);
  assert.doesNotMatch(managerPage, /name: "Activity", value:/);
  assert.doesNotMatch(managerPage, /name: "Leads", value:/);
  assert.doesNotMatch(managerPage, /name: "Manual", value:/);
  assert.doesNotMatch(managerPage, /setDate\(\(current\) => anchorDateForPeriod\(current, item\.value\)\)/);
  assert.doesNotMatch(adminPage, /setDate\(\(current\) => anchorDateForPeriod\(current, item\.value\)\)/);
});

test("deal bell identity is verified server-side", () => {
  const route = read("app/api/ring-bell/route.ts");
  const auth = read("lib/server/apiAuth.ts");
  assert.match(route, /verifyBackendUser\(request\)/);
  assert.match(route, /user\.role !== "sales_user"/);
  assert.doesNotMatch(route, /request\.json\(\)/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /cache: "no-store"/);
});
