import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AxiosHeaders } from "axios";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const teamLeads = await import(pathToFileURL(resolve(root, "lib/teamLeads.ts")).href);

function requestConfig(method, url) {
  return {
    method,
    url,
    headers: new AxiosHeaders({ Authorization: "Bearer manager-token" }),
  };
}

function member(overrides = {}) {
  return {
    id: "member-1",
    username: "john",
    fullName: "John Silva",
    email: "john@example.com",
    role: "sales_user",
    isActive: true,
    lifecycleStatus: "active",
    deactivatedAt: null,
    deactivationReason: "",
    lastActiveAt: null,
    access: { canView: true, canManage: true, takeoverRequired: true },
    ...overrides,
  };
}

test("Team Leads navigation and route are restricted to the three manager roles", () => {
  assert.equal(teamLeads.canAccessTeamLeads("sales_manager_user"), true);
  assert.equal(teamLeads.canAccessTeamLeads("delegate_manager_user"), true);
  assert.equal(teamLeads.canAccessTeamLeads("production_manager_user"), true);
  for (const role of [
    "sales_user",
    "delegate_user",
    "production_user",
    "ceo_user",
    "super_admin_user",
    "client_user",
    "marketing_user",
  ]) {
    assert.equal(teamLeads.canAccessTeamLeads(role), false);
  }

  const sidebar = read("components/layout/Sidebar.tsx");
  const shell = read("components/layout/AppShell.tsx");
  assert.match(sidebar, /\{\s*name:\s*"Team Leads",\s*href:\s*"\/team-leads",[\s\S]*?managerOnly:\s*true\s*\}/);
  assert.match(shell, /pathname === "\/team-leads"/);
});

test("primary sidebar pages use distinct, purpose-specific icons", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  const navBlock = sidebar.slice(
    sidebar.indexOf("const navItems:"),
    sidebar.indexOf("const APP_VERSION_LABEL"),
  );
  const iconAssignments = [...navBlock.matchAll(/href:\s*"[^"]+",\s*icon:\s*(\w+)/g)].map(
    (match) => match[1],
  );

  assert.equal(new Set(iconAssignments).size, iconAssignments.length);
  assert.match(navBlock, /name:\s*"My Leads",[\s\S]*?icon:\s*ContactRound/);
  assert.match(navBlock, /name:\s*"Team Leads",[\s\S]*?icon:\s*UsersRound/);
  assert.match(
    navBlock,
    /href:\s*"\/manager\/user-performance",\s*icon:\s*ChartNoAxesCombined/,
  );
});

test("active members sort before inactive, resigned, and terminated members", () => {
  const rows = teamLeads.sortTeamLeadMembers([
    member({ id: "terminated", fullName: "A", isActive: false, lifecycleStatus: "terminated" }),
    member({ id: "active", fullName: "Z", lifecycleStatus: "active" }),
    member({ id: "inactive", fullName: "B", isActive: false, lifecycleStatus: "inactive" }),
  ]);
  assert.deepEqual(rows.map((item) => item.id), ["active", "terminated", "inactive"]);

  const page = read("app/team-leads/page.tsx");
  for (const status of ["Active", "Inactive", "Resigned", "Terminated"]) {
    assert.match(page, new RegExp(status.toLowerCase(), "i"));
  }
});

test("selected member card is removed and takeover controls live beside the tabs", () => {
  const page = read("app/team-leads/page.tsx");
  const takeControlClassIndex = page.indexOf('className="h-10 rounded-full');
  const takeControlButton = page.slice(
    page.lastIndexOf("<Button", takeControlClassIndex),
    page.indexOf("</Button>", takeControlClassIndex),
  );

  assert.doesNotMatch(page, /Viewing leads owned by/);
  assert.match(page, /role="tablist" aria-label="Team lead views"/);
  assert.match(page, /Action history[\s\S]*?Take control/);
  assert.match(takeControlButton, /rounded-full/);
  assert.match(takeControlButton, /bg-blue-600/);
  assert.doesNotMatch(takeControlButton, /LockKeyhole/);
  assert.match(page, /aria-label="About takeover controls"/);
  assert.match(page, /role="tooltip"/);
  assert.match(page, /every action is recorded under your manager account/);
});

test("Team Leads member selection reuses the performance selector design", () => {
  const page = read("app/team-leads/page.tsx");

  assert.match(page, /memberStatusDotClass/);
  assert.match(page, /memberName\(member\)\.slice\(0, 1\)\.toUpperCase\(\)/);
  assert.match(page, /border-blue-200 bg-blue-50 text-blue-800 shadow-sm/);
  assert.match(page, /memberStatusDotClass\(member\.lifecycleStatus\)/);
  assert.doesNotMatch(page, /function StatusBadge/);
});

test("member pagination stays at the bottom of the department panel", () => {
  const page = read("app/team-leads/page.tsx");

  assert.match(page, /<aside className="flex min-h-0 flex-col/);
  assert.match(page, /className="min-h-72 flex-1 overflow-y-auto p-2 scrollbar-modern"/);
});

test("desktop Team Leads fits the viewport with a compact title-only header", () => {
  const page = read("app/team-leads/page.tsx");
  const myLeadsPage = read("app/my-leads/page.tsx");

  assert.doesNotMatch(page, /Manager workspace/);
  assert.doesNotMatch(
    page,
    /Review retained pipeline work, take control when needed, and keep every manager action auditable\./,
  );
  assert.match(page, /xl:h-\[calc\(100dvh-3rem\)\] xl:overflow-hidden/);
  assert.match(page, /xl:min-h-0 xl:flex-1 xl:overflow-hidden/);
  assert.match(myLeadsPage, /xl:h-full xl:min-h-0/);
});

test("selected member headers are added while the manager bearer token is preserved", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "sales",
    lifecycleStatus: "inactive",
    isActive: false,
    canManage: true,
    takeoverRequired: false,
    takeoverReason: "",
  });
  const config = teamLeads.attachTeamLeadRequestHeaders(requestConfig("get", "/api/my-leads/events"));
  assert.equal(config.headers.get("X-Team-Member-User-Id"), "member-1");
  assert.equal(config.headers.get("Authorization"), "Bearer manager-token");
  teamLeads.clearTeamLeadRequestScope();
});

test("active members can be viewed before takeover, including canManage false members", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "sales",
    lifecycleStatus: "active",
    isActive: true,
    canManage: false,
    takeoverRequired: true,
    takeoverReason: "",
  });
  const config = teamLeads.attachTeamLeadRequestHeaders(
    requestConfig("get", "/api/my-leads/events"),
  );
  assert.equal(config.headers.get("X-Team-Member-User-Id"), "member-1");
  assert.equal(config.headers.has("X-Team-Takeover-Reason"), false);
  teamLeads.clearTeamLeadRequestScope();
});

test("Team Leads query keys are isolated by member ID", () => {
  const first = teamLeads.teamLeadQueryKey("member-1", "events", 0);
  const second = teamLeads.teamLeadQueryKey("member-2", "events", 0);
  assert.notEqual(first, second);
  assert.match(first, /member-1/);
  assert.match(second, /member-2/);
});

test("active-member mutations require takeover before a request can be sent", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "sales",
    lifecycleStatus: "active",
    isActive: true,
    canManage: true,
    takeoverRequired: true,
    takeoverReason: "",
  });
  assert.throws(
    () => teamLeads.attachTeamLeadRequestHeaders(requestConfig("put", "/api/leads/lead-1/workflow-status")),
    (error) => error.status === 409 && error.code === "team_member_takeover_required",
  );
  teamLeads.clearTeamLeadRequestScope();
});

test("confirmed active-member mutations carry the takeover reason", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "sales",
    lifecycleStatus: "active",
    isActive: true,
    canManage: true,
    takeoverRequired: true,
    takeoverReason: "Covering annual leave",
  });
  const config = teamLeads.attachTeamLeadRequestHeaders(
    requestConfig("post", "/api/campaigns/campaign-1/start-outreach"),
  );
  assert.equal(config.headers.get("X-Team-Member-User-Id"), "member-1");
  assert.equal(config.headers.get("X-Team-Takeover-Reason"), "Covering annual leave");
  teamLeads.clearTeamLeadRequestScope();
});

test("inactive-member mutations do not require takeover", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "delegates",
    lifecycleStatus: "resigned",
    isActive: false,
    canManage: true,
    takeoverRequired: false,
    takeoverReason: "",
  });
  const config = teamLeads.attachTeamLeadRequestHeaders(
    requestConfig("delete", "/api/delegates/leads/lead-1/attachments/file-1"),
  );
  assert.equal(config.headers.get("X-Team-Member-User-Id"), "member-1");
  assert.equal(config.headers.has("X-Team-Takeover-Reason"), false);
  teamLeads.clearTeamLeadRequestScope();
});

test("switching members clears takeover state instead of leaking the prior reason", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "sales",
    lifecycleStatus: "active",
    isActive: true,
    canManage: true,
    takeoverRequired: true,
    takeoverReason: "First reason",
  });
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-2",
    memberName: "Jane Perera",
    pipeline: "sales",
    lifecycleStatus: "active",
    isActive: true,
    canManage: true,
    takeoverRequired: true,
    takeoverReason: "",
  });
  assert.equal(teamLeads.getTeamLeadRequestScope().memberId, "member-2");
  assert.equal(teamLeads.getTeamLeadRequestScope().takeoverReason, "");
  teamLeads.clearTeamLeadRequestScope();
});

test("activity history renders actor, owner, action, outcome, and time", () => {
  const page = read("app/team-leads/page.tsx");
  assert.match(page, /item\.actor\?\.fullName \|\| item\.actor\?\.username/);
  assert.match(page, /item\.owner\?\.fullName \|\| item\.owner\?\.username/);
  assert.match(page, /item\.action/);
  assert.match(page, /item\.outcome/);
  assert.match(page, /formatDateTime\(item\.createdAt\)/);
  assert.match(page, /listTeamLeadActions/);
  assert.match(page, /Load more/);
});

test("member and audit responses normalize lifecycle and userId identities", () => {
  const inactive = teamLeads.normalizeTeamLeadMember({
    id: "member-3",
    username: "nimal",
    isActive: false,
    lifecycleStatus: "resigned",
    access: { canView: true, canManage: false, takeoverRequired: false },
  });
  assert.equal(inactive.lifecycleStatus, "resigned");
  assert.equal(inactive.isActive, false);
  assert.equal(inactive.access.canView, true);

  const action = teamLeads.normalizeTeamLeadAction({
    id: "audit-1",
    actor: { userId: "manager-1", username: "manager" },
    owner: { userId: "member-3", fullName: "Nimal Perera" },
    action: "workflow_status_changed",
    outcome: "succeeded",
  });
  assert.equal(action.actor.userId, "manager-1");
  assert.equal(action.owner.userId, "member-3");
  assert.equal(action.outcome, "succeeded");
  assert.equal("id" in action.actor, false);
});

test("active takeoverRequired members unlock with a valid reason even when canManage is false", () => {
  teamLeads.setTeamLeadRequestScope({
    memberId: "member-1",
    memberName: "John Silva",
    pipeline: "production",
    lifecycleStatus: "active",
    isActive: true,
    canManage: false,
    takeoverRequired: true,
    takeoverReason: "Manager coverage",
  });
  const config = teamLeads.attachTeamLeadRequestHeaders(
    requestConfig("patch", "/api/productions/leads/lead-1"),
  );
  assert.equal(config.headers.get("X-Team-Member-User-Id"), "member-1");
  assert.equal(config.headers.get("X-Team-Takeover-Reason"), "Manager coverage");
  teamLeads.clearTeamLeadRequestScope();
});

test("delegation allowlists are department-specific and exclude manager audit APIs", () => {
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/all/leads", "sales"), true);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/workflow-statuses", "sales"), true);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/delegates/all/leads", "delegates"), true);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/delegates/workflow-statuses", "delegates"), true);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/productions/events", "production"), true);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/campaigns", "delegates"), false);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/event-agendas", "sales"), false);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/manager/team-leads/members", "sales"), false);
  assert.equal(teamLeads.isTeamLeadDelegatedUrl("/api/manager/team-leads/actions", "sales"), false);
});

test("audit history is an ordinary authenticated GET without delegation headers", () => {
  const source = read("lib/teamLeadsApi.ts");
  assert.match(
    source,
    /apiClient\.get<Record<string, unknown>>\(\s*"\/api\/manager\/team-leads\/actions"/,
  );
  const actionFunction = source.slice(source.indexOf("export async function listTeamLeadActions"));
  assert.doesNotMatch(actionFunction, /teamLeadRequest/);
  assert.doesNotMatch(actionFunction, /TEAM_LEAD_MEMBER_HEADER/);
});

test("request scope is cleared when switching members, leaving the page, and signing out", () => {
  const page = read("app/team-leads/page.tsx");
  const auth = read("lib/auth.ts");
  assert.match(page, /clearTeamLeadRequestScope\(\);[\s\S]*setSelectedMember\(member\)/);
  assert.match(page, /return \(\) => \{\s*clearTeamLeadRequestScope\(\);/);
  assert.match(auth, /export function clearAuthSession\(\)[\s\S]*clearTeamLeadRequestScope\(\)/);
});

test("action history renders started, succeeded, denied, and failed outcomes", () => {
  const page = read("app/team-leads/page.tsx");
  for (const outcome of ["started", "succeeded", "denied", "failed"]) {
    assert.match(page, new RegExp(`value="${outcome}"`));
  }
  assert.match(page, />Action history</);
});

test("manager permission, missing member, takeover, and audit-unavailable errors are explicit", () => {
  assert.match(teamLeads.getTeamLeadErrorMessage({ status: 403 }), /permission/i);
  assert.match(teamLeads.getTeamLeadErrorMessage({ status: 404 }), /outside your department/i);
  assert.match(teamLeads.getTeamLeadErrorMessage({ status: 409 }), /takeover reason/i);
  assert.equal(
    teamLeads.getTeamLeadErrorMessage({
      status: 503,
      data: { code: "manager_lead_audit_unavailable" },
    }),
    "The action was not executed because it could not be safely audited.",
  );
});

test("normal My Leads behavior remains unscoped when Team Leads is inactive", () => {
  teamLeads.clearTeamLeadRequestScope();
  const config = teamLeads.attachTeamLeadRequestHeaders(requestConfig("get", "/api/my-leads/events"));
  assert.equal(config.headers.has("X-Team-Member-User-Id"), false);
  assert.equal(config.headers.get("Authorization"), "Bearer manager-token");

  const myLeadsPage = read("app/my-leads/page.tsx");
  assert.match(myLeadsPage, /export default function MyLeadsPage\(\)/);
  assert.match(myLeadsPage, /return <MyLeadsWorkspace \/>/);
});

test("embedded Team Leads hides the standalone My Leads decorative media", () => {
  const teamLeadsPage = read("app/team-leads/page.tsx");
  const myLeadsPage = read("app/my-leads/page.tsx");

  assert.match(teamLeadsPage, /<MyLeadsWorkspace[\s\S]*?embedded[\s\S]*?teamMemberId=/);
  assert.match(myLeadsPage, /\{!embedded \? \([\s\S]*?my-leads-side-media[\s\S]*?\) : null\}/);
});

test("embedded Team Leads hides the standalone Add comment control", () => {
  const myLeadsPage = read("app/my-leads/page.tsx");
  const addCommentIndex = myLeadsPage.indexOf("Add comment");
  const embeddedGuardIndex = myLeadsPage.lastIndexOf("{!embedded ? (", addCommentIndex);

  assert.notEqual(addCommentIndex, -1);
  assert.notEqual(embeddedGuardIndex, -1);
  assert.ok(addCommentIndex - embeddedGuardIndex < 1_000);
});

test("embedded Team Leads supports selectable ranges and scrolls larger lists", () => {
  const myLeadsPage = read("app/my-leads/page.tsx");

  assert.match(myLeadsPage, /const PAGE_SIZE_OPTIONS = \[5, 50, 100, 200\] as const/);
  assert.match(myLeadsPage, /const EMBEDDED_PAGE_SIZE = 5/);
  assert.match(
    myLeadsPage,
    /useState<number>\(embedded \? EMBEDDED_PAGE_SIZE : 100\)/,
  );
  assert.match(
    myLeadsPage,
    /embedded && pageSize === EMBEDDED_PAGE_SIZE \? "overflow-hidden" : "overflow-auto"/,
  );
  assert.match(
    myLeadsPage,
    /pageSize === EMBEDDED_PAGE_SIZE &&\s*"grid min-h-0 flex-1 grid-rows-5"/,
  );
  assert.match(myLeadsPage, /\{embedded \? "Leads per page" : "Visible range"\}/);
});

test("offboarding retains accounts and supports lifecycle reasons", () => {
  const usersPage = read("app/admin/users/page.tsx");
  const adminApi = read("app/admin/admin-api.ts");
  assert.match(usersPage, /"active" \| "inactive" \| "resigned" \| "terminated"/);
  assert.match(usersPage, /deactivationReason/);
  assert.match(usersPage, /Deactivate account/);
  assert.match(usersPage, /retained leads will be preserved/);
  assert.doesNotMatch(usersPage, /Delete User/);
  assert.match(adminApi, /deactivated\?: boolean/);
  assert.match(adminApi, /retained\?: boolean/);
  const updatePayload = usersPage.slice(
    usersPage.indexOf("const updated = await updateAuthUser"),
    usersPage.indexOf("setUsers((prev)", usersPage.indexOf("const updated = await updateAuthUser")),
  );
  assert.match(updatePayload, /lifecycleStatus:/);
  assert.doesNotMatch(updatePayload, /isActive:/);
});
