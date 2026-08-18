import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const peopleUtils = await import(pathToFileURL(resolve(root, "lib/peopleUtils.ts")).href);

test("notification helpers preserve records and update unread state", () => {
  const readAt = "2026-07-21T10:00:00.000Z";
  const records = [
    { id: "one", isRead: false, title: "One" },
    { id: "two", isRead: false, title: "Two" },
  ];
  const oneRead = peopleUtils.markOneNotificationRead(records, "one", readAt);
  assert.equal(oneRead[0].isRead, true);
  assert.equal(oneRead[0].readAt, readAt);
  assert.equal(oneRead[1].isRead, false);
  assert.equal(records[0].isRead, false, "optimistic state is immutable");
  assert.ok(peopleUtils.markEveryNotificationRead(records, readAt).every((item) => item.readAt === readAt));
});

test("read notifications leave every notification UI use case after 24 hours", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const records = [
    { id: "unread-old", type: "system_update", isRead: false, readAt: "2026-07-01T00:00:00.000Z" },
    { id: "recent-agenda", type: "event_agenda_uploaded", isRead: true, readAt: "2026-07-21T12:00:01.000Z" },
    { id: "expired-inquiry", type: "event_inquiry", isRead: true, readAt: "2026-07-21T12:00:00.000Z" },
    { id: "expired-birthday", type: "member_birthday", isRead: true, readAt: "2026-07-20T11:59:59.000Z" },
    { id: "legacy-read", type: "system_update", isRead: true, readAt: null },
  ];

  assert.deepEqual(
    peopleUtils.notificationsWithinReadRetention(records, now).map((item) => item.id),
    ["unread-old", "recent-agenda", "legacy-read"],
  );
  assert.equal(
    peopleUtils.millisecondsUntilNextReadNotificationExpiry([records[1]], now),
    1000,
  );
});

test("notification helpers retain operational history but keep birthdays on the current local day", () => {
  const today = new Date(2026, 6, 21, 10, 0, 0);
  const yesterday = new Date(2026, 6, 20, 10, 0, 0);
  const dateKey = peopleUtils.localCalendarDateKey(today);
  const records = [
    { id: "today-system", type: "system_update", createdAt: today.toISOString() },
    { id: "old-system", type: "system_update", createdAt: yesterday.toISOString() },
    { id: "today-birthday", type: "birthday_wish", occurrenceDate: dateKey, createdAt: yesterday.toISOString() },
  ];

  assert.deepEqual(
    peopleUtils.notificationsForCalendarDate(records, dateKey).map((item) => item.id),
    ["today-system", "old-system", "today-birthday"],
  );
  assert.ok(peopleUtils.millisecondsUntilNextLocalDay(today) > 0);
});

test("notification center covers loading, unread count, empty, retry, mark-one, mark-all and pagination", () => {
  const source = read("components/notifications/NotificationCenter.tsx");
  assert.match(source, /listNotifications/);
  assert.match(source, /unreadCount > 99/);
  assert.match(source, /markNotificationRead\(notification\.id, controller\.signal\)/);
  assert.match(source, /markAllNotificationsRead\(controller\.signal\)/);
  assert.match(source, /You’re all caught up/);
  assert.match(source, /Notifications unavailable/);
  assert.match(source, />Retry</);
  assert.match(source, /hasMore[\s\S]*Load more/);
  assert.match(source, /birthday_wish/);
  assert.match(source, /Birthday: \{subjectName\}/);
  assert.match(source, /Updates from your workspace/);
  assert.match(source, /MessageSquareDot/);
  assert.match(source, /PartyPopper/);
  assert.match(source, /event_inquiry/);
  assert.match(source, /View inquiry details/);
  assert.match(source, /event_agenda_uploaded/);
  assert.match(source, /Download agenda/);
  assert.match(source, /event_speaker_list_uploaded/);
  assert.match(source, /Download speaker list/);
  assert.match(source, /event_delegate_list_uploaded/);
  assert.match(source, /Download delegate list/);
  assert.match(source, /downloadEventDocumentFile/);
  assert.doesNotMatch(source, /A birthday wish for you/);
  assert.doesNotMatch(source, /Birthday updates from your team/);
  assert.match(source, /pathname !== "\/dashboard"/);
  assert.match(source, /notification\.type === "birthday_wish"/);
  assert.match(source, /birthday-popup:last-shown:\$\{sessionKey\}/);
  assert.match(source, /aria-labelledby="birthday-popup-title"/);
  assert.match(source, /millisecondsUntilNextLocalDay/);
  assert.match(source, /millisecondsUntilNextReadNotificationExpiry/);
  assert.match(source, /notificationsWithinReadRetention/);
  assert.match(source, /nextNotificationOffsetRef/);
});

test("notification trigger follows the Pro inbox pattern without overlapping page headers", () => {
  const source = read("components/notifications/NotificationCenter.tsx");
  assert.match(source, /import \{[^}]*Inbox[^}]*\} from "lucide-react"/);
  assert.match(source, /fixed bottom-4 right-3/);
  assert.match(source, /absolute bottom-full right-0 mb-3/);
  assert.doesNotMatch(source, /fixed right-4 top-4/);
});

test("lead sheet pagination reserves space for the notification trigger", () => {
  for (const relativePath of ["components/leads/NormalUserEventLeadSheet.tsx", "app/my-leads/page.tsx"]) {
    const source = read(relativePath);
    assert.match(source, /pb-20[\s\S]*sm:pb-4[\s\S]*sm:pr-16/);
  }
});

test("notification polling and stale requests are cleaned up on unmount/logout", () => {
  const center = read("components/notifications/NotificationCenter.tsx");
  const shell = read("components/layout/AppShell.tsx");
  assert.match(center, /setInterval\(\(\) => void load\(\), NOTIFICATION_POLL_MS\)/);
  assert.match(center, /if \(open\) void load\(\)/);
  assert.match(center, /window\.clearInterval\(interval\)/);
  assert.match(center, /requestRef\.current\?\.abort\(\)/);
  assert.match(shell, /if \(!session\)/);
  assert.match(shell, /<NotificationCenter sessionKey=\{session\.user\.id\}/);
});

test("heartbeat activity predicate handles active, hidden, unfocused and idle states", () => {
  const now = 1_000_000;
  assert.equal(peopleUtils.shouldReportActive({ visible: true, focused: true, lastInteractionAt: now - 1_000, now }), true);
  assert.equal(peopleUtils.shouldReportActive({ visible: false, focused: true, lastInteractionAt: now - 1_000, now }), false);
  assert.equal(peopleUtils.shouldReportActive({ visible: true, focused: false, lastInteractionAt: now - 1_000, now }), false);
  assert.equal(peopleUtils.shouldReportActive({ visible: true, focused: true, lastInteractionAt: now - peopleUtils.ACTIVITY_IDLE_MS, now }), false);
});

test("heartbeat hook has one interval, inactive transitions, keepalive and full cleanup", () => {
  const source = read("hooks/useActivityTracking.ts");
  assert.equal((source.match(/window\.setInterval/g) || []).length, 1);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /document\.hasFocus\(\)/);
  assert.match(source, /report\(false, true\)/);
  assert.match(source, /getBrowserTimeZone/);
  assert.match(source, /\{ active, timeZone: getBrowserTimeZone\(\), appSurface: "light" \}/);
  assert.match(source, /\{ active: false, timeZone: getBrowserTimeZone\(\), appSurface: "light" \}/);
  assert.match(source, /\{ keepalive: true \}/);
  assert.match(source, /window\.clearInterval\(interval\)/);
  assert.match(source, /removeEventListener/);
  assert.match(source, /controller\.abort\(\)/);
});

test("activity tracking is initialized once in the authenticated shell and excluded from sign-in", () => {
  const shell = read("components/layout/AppShell.tsx");
  assert.equal((shell.match(/useActivityTracking\(/g) || []).length, 1);
  assert.match(shell, /authChecked && session && !isAuthRoute/);
});

test("CEO, super-admin, and department managers can monitor scoped user activity", () => {
  assert.equal(peopleUtils.canMonitorUserActivity("ceo_user"), true);
  assert.equal(peopleUtils.canMonitorUserActivity("super_admin_user"), true);
  assert.equal(peopleUtils.canMonitorUserActivity("sales_manager_user"), true);
  assert.equal(peopleUtils.canMonitorUserActivity("delegate_manager_user"), true);
  assert.equal(peopleUtils.canMonitorUserActivity("production_manager_user"), true);
  assert.equal(peopleUtils.canMonitorUserActivity("sales_user"), false);

  const performance = read("app/admin/user-performance/page.tsx");
  assert.match(performance, /canViewActivity = canMonitorUserActivity\(user\?\.role\)/);
  assert.match(performance, /activeView === "activity" && canViewActivity/);
});

test("user activity is merged into user performance", () => {
  const adminShell = read("components/layout/AdminPanelShell.tsx");
  const sidebar = read("components/layout/Sidebar.tsx");
  const performance = read("app/admin/user-performance/page.tsx");
  const legacyRoute = read("app/admin/user-activity/page.tsx");

  assert.doesNotMatch(adminShell, /href: "\/admin\/user-activity"/);
  assert.doesNotMatch(sidebar, /href: "\/admin\/user-activity"/);
  assert.match(performance, /<UserActivityPanel \/>/);
  assert.match(performance, /label: "User Activity"/);
  assert.match(performance, /fetchUserActivity\(\{[\s\S]*period,/);
  assert.doesNotMatch(performance, /activityPeriodForPerformance/);
  assert.match(read("components/admin/UserActivityPanel.tsx"), /value: "yearly", label: "Yearly"/);
  const managerPerformance = read("app/manager/user-performance/page.tsx");
  assert.match(managerPerformance, /fetchManagerUserActivity\(\{[\s\S]*period,/);
  assert.doesNotMatch(managerPerformance, /period === "yearly"[\s\S]*period: "monthly"/);
  assert.match(legacyRoute, /redirect\("\/admin\/user-performance#activity"\)/);
});

test("client access only exists inside user and role management", () => {
  const shell = read("components/layout/AdminPanelShell.tsx");
  const dashboard = read("app/admin/page.tsx");
  const users = read("app/admin/users/page.tsx");

  assert.doesNotMatch(shell, /href: "\/admin\/client-access"/);
  assert.doesNotMatch(dashboard, /href: "\/admin\/client-access"/);
  assert.match(users, /type AdminUsersTab = "users" \| "add-user" \| "client-access"/);
  assert.match(users, /id: "client-access" as const, label: "Client Access"/);
  assert.match(users, /activeTab === "client-access"/);
});

test("engaged screen time formatter reports hours and minutes", () => {
  assert.equal(peopleUtils.formatEngagedDuration(0), "0 min");
  assert.equal(peopleUtils.formatEngagedDuration(59), "1 min");
  assert.equal(peopleUtils.formatEngagedDuration(3_600), "1 hr");
  assert.equal(peopleUtils.formatEngagedDuration(12_600), "3 hr 30 min");
});

test("null activity timestamps produce the no-activity state", () => {
  assert.equal(peopleUtils.hasRecordedUserActivity({ firstSeenAt: null, lastSeenAt: null, lastActiveAt: null }), false);
  assert.equal(peopleUtils.hasRecordedUserActivity({ firstSeenAt: "2026-07-20T08:00:00Z" }), true);
  const page = read("components/admin/UserActivityPanel.tsx");
  assert.match(page, /No activity recorded/);
  assert.match(page, /Last login/);
  assert.doesNotMatch(page, /lastLoginAt[^\n]*Last online/i);
});

test("activity times use each user's recorded browser timezone", () => {
  const panel = read("components/admin/UserActivityPanel.tsx");
  const api = read("lib/peopleApi.ts");
  const auth = read("lib/auth.ts");
  const performance = read("app/admin/user-performance/page.tsx");

  assert.match(api, /timeZone\?: string/);
  assert.match(api, /typeof window === "undefined"/);
  assert.match(api, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(api, /export type UserActivityRecord[\s\S]*?timeZone: string/);
  assert.match(auth, /export type AuthUser[\s\S]*?timeZone\?: string/);
  assert.match(auth, /source\.timeZone \?\? source\.time_zone/);
  assert.match(panel, /activityUser\.timeZone \|\| reportTimeZone \|\| browserTimeZone/);
  assert.match(panel, /each user's local calendar/);
  assert.match(performance, /activityRecord\?\.timeZone \|\| activityData\?\.period\.timezone/);
});

test("user activity filter includes departments and individual users", () => {
  const panel = read("components/admin/UserActivityPanel.tsx");
  assert.match(panel, /<optgroup label="Departments">/);
  assert.match(panel, /<optgroup label="Individual users">/);
  for (const department of ["Administration", "Sales", "Delegate", "Production", "Business Operations", "Client"]) {
    assert.match(panel, new RegExp(`label: "${department}"`));
  }
  assert.match(panel, /selectedDepartment\.roles\.some/);
  assert.match(panel, /selectedDepartment \? 100 : PAGE_SIZE/);
  assert.match(panel, /managerView \? fetchManagerUserActivity : fetchUserActivity/);
  assert.match(panel, /FrontendUsageBreakdown/);
  assert.match(panel, /Light/);
  assert.match(panel, /Heavy/);
  assert.match(panel, /tableViewportRef\.current\?\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(panel, /hidden min-h-0 flex-1[\s\S]*overflow-auto/);
  assert.match(panel, /\[scrollbar-width:none\][\s\S]*\[&::-webkit-scrollbar\]:hidden/);
  assert.match(panel, /<thead className="sticky top-0 z-10/);
  assert.match(panel, /snap-y snap-mandatory scroll-pt-10/);
  assert.match(panel, /snap-start snap-always align-top \[&>td\]:py-3/);
  assert.match(panel, /pb-16[\s\S]*sm:pb-0[\s\S]*sm:pr-16/);
});

test("KPI activities show comments only when present with author, time and history count", () => {
  const manager = read("app/manager/user-performance/page.tsx");
  const admin = read("app/admin/user-performance/page.tsx");
  for (const source of [manager, admin]) {
    assert.match(source, /activity\.comment \?/);
    assert.match(source, /commentUpdatedByUserDisplayName/);
    assert.match(source, /commentUpdatedAt/);
    assert.match(source, /commentHistoryCount/);
    assert.match(source, /comments in history/);
  }
});

test("manager performance uses the CEO detail hierarchy without redundant report panels", () => {
  const source = read("app/manager/user-performance/page.tsx");

  assert.match(source, /const PERFORMANCE_CARD_CLASS/);
  assert.match(source, />Department Performance</);
  assert.match(source, /aria-label="Team users"/);
  assert.match(source, /lg:grid-cols-\[16rem_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(source, /function SummaryMetric/);
  assert.doesNotMatch(source, /aria-label="Performance filters"/);
  assert.match(source, /aria-label="Toggle performance filters"/);
  assert.match(source, /aria-controls="department-performance-filters"/);
  assert.match(source, /filterPanelOpen \? \(/);
  assert.match(source, /<UserAvatar[\s\S]*?user=\{item\}/);
  assert.match(source, /item\.isActive \? "bg-emerald-500" : "bg-zinc-400"/);
  assert.match(source, /border-blue-200 bg-blue-50/);
  assert.match(source, /function PerformanceChartSection/);
  assert.match(source, /useState<PerformanceSection>\("overview"\)/);
  assert.match(source, /aria-label="Performance sections"[\s\S]*?<PerformanceChartSection/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /activeSection === "overview"/);
  assert.match(source, /activeSection === "members"/);
  assert.match(source, /activeSection === "activity"/);
  assert.match(source, /aria-label=\{`Performance:/);
  assert.match(source, /data=\{performanceData\}/);
  assert.match(source, /dataKey="KPI"/);
  assert.match(source, /dataKey="Revenue"/);
  assert.match(source, /<PieChart>/);
  assert.match(source, /selectedMetric/);
  assert.match(source, /selectedVersion/);
  assert.match(source, /aria-label="Performance and system usage"/);
  assert.match(source, />System usage</);
  assert.match(source, /fetchManagerUserActivity/);
  assert.match(source, /date: dateValue,[\s\S]*period,/);
  assert.doesNotMatch(source, /period: "monthly" as const/);
  assert.match(source, /lightSeconds=\{versionUsage\.light\}/);
  assert.match(source, /heavySeconds=\{versionUsage\.heavy\}/);
  assert.doesNotMatch(source, /<UserActivityPanel \/>/);
  assert.doesNotMatch(source, /Select a team member to focus the same report and activity data/);
  assert.doesNotMatch(source, />Performance mix</);
  assert.match(source, /innerRadius="58%"/);
  assert.match(source, /xl:grid-cols-2/);
  assert.match(source, /border border-zinc-200 bg-white p-3 shadow/);
  assert.doesNotMatch(source, /bg-slate-950/);
  assert.match(source, /grid-cols-\[2rem_minmax\(0,1fr\)\]/);
  assert.match(source, /if \(normalized === "workflow-status"\) return "Status"/);
  assert.match(source, /placeholder="Filter by status"/);
  assert.match(source, /function statusTextClass/);
  assert.match(source, /statusTextClass\(\s*lead\.currentWorkflowStatus\s*\)/);
  assert.doesNotMatch(source, /Department overview/);
  assert.match(source, />Recent activity and comments</);
  assert.match(source, /h-\[calc\(100dvh-3rem\)\]/);
  assert.match(source, /mt-5 flex min-h-0 flex-1 flex-col overflow-hidden/);
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source, /min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-modern/);
  assert.match(source, /lg:h-full[\s\S]*lg:overflow-y-auto/);
  assert.match(source, /className="h-full min-h-\[22rem\] py-4"/);
  assert.doesNotMatch(source, /Manager Control/);
  assert.doesNotMatch(source, /<h2[^>]*>Window<\/h2>/);
  assert.doesNotMatch(source, /<h2[^>]*>Scope<\/h2>/);
  assert.doesNotMatch(source, /snapshot\.linkedinUrl/);
});

test("admin performance stays focused and includes activity context", () => {
  const source = read("app/admin/user-performance/page.tsx");
  assert.match(source, /fetchUserActivity/);
  assert.match(source, /Last active/);
  assert.match(source, /Screen time/);
  assert.match(source, /formatEngagedDuration/);
  assert.match(source, /hasRecordedUserActivity/);
  assert.match(source, /Department KPI contribution graphs/);
  assert.match(source, /<PieKpiChart cluster=\{cluster\}/);
  assert.match(source, /<SpiderKpiChart cluster=\{cluster\} maxValues=\{maxValues\}/);
  assert.match(source, /label: "Pie Chart"/);
  assert.match(source, /label: "Spider Chart"/);
  assert.match(source, />Active</);
  assert.match(source, />Contributors</);
  assert.match(source, />Average</);
  assert.match(source, />Top user</);
  assert.match(source, /aria-label="Departments"/);
  assert.match(source, /lg:grid-cols-\[16rem_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:flex-col/);
  assert.match(source, /<Activity className="h-4 w-4"/);
  assert.match(source, /selectedCluster\?\.averagePerUser/);
  assert.match(source, /\bDetails\b/);
  assert.match(source, /Department Details/);
  assert.match(source, /activeView === "activity"[\s\S]*h-\[calc\(100dvh-3rem\)\][\s\S]*overflow-hidden/);
  assert.match(source, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(source, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /Window overview/);
  assert.match(source, />Period</);
  assert.match(source, />Starts</);
  assert.match(source, />Ends</);
  assert.doesNotMatch(source, /selectedTopRunnerValue/);
  assert.doesNotMatch(source, /style=\{\{ width: `\$\{progress\}%`/);
  assert.doesNotMatch(source, /split by contributor/);
  assert.doesNotMatch(source, /Each axis is scaled/);
  assert.doesNotMatch(source, /Compare department contribution/);
  assert.doesNotMatch(source, /Top Contributors/);
  assert.doesNotMatch(source, /Managers and admins can compare/);
});

test("KPI comments use a prominent labelled treatment", () => {
  const source = read("app/admin/user-performance/page.tsx");
  assert.match(source, /function ProminentKpiComment/);
  assert.match(source, /MessageSquareText/);
  assert.match(source, /aria-label="KPI comment"/);
  assert.match(source, /<blockquote className="mt-2 text-sm font-semibold/);
  assert.match(source, /border-blue-200 bg-blue-50/);
});

test("KPI activities tolerate legacy records without an activity type", () => {
  const manager = read("app/manager/user-performance/page.tsx");
  const authModels = read("lib/auth.ts");
  assert.match(manager, /activityTypeLabel\(activity\.type\)/);
  assert.match(manager, /textValue\(value, "Activity"\)\.toLowerCase\(\)/);
  assert.match(manager, /activity\.type \|\| "activity"/);
  assert.match(authModels, /type\?:[\s\S]*?string \| null/);
});

test("workflow comment submission trims, validates length, supports comment-only updates and blocks duplicates", () => {
  for (const relativePath of ["app/my-leads/page.tsx", "components/leads/NormalUserEventLeadSheet.tsx"]) {
    const source = read(relativePath);
    assert.match(source, /statusComment\.trim\(\)/);
    assert.match(source, /maxLength=\{2000\}/);
    assert.match(source, /characters remaining/);
    assert.match(source, /nextStatus: item\.workflowStatus/);
    assert.match(source, /updatingLeadIds|updatingKeys/);
    assert.match(source, /Comment added/);
  }

  for (const relativePath of ["lib/api.ts", "lib/apidele.ts", "lib/apiproduction.ts"]) {
    const source = read(relativePath);
    assert.match(source, /workflow-status/);
    assert.match(source, /\{ workflowStatus, comment, dealAmountUsd \}/);
  }
});

test("people endpoints stay centralized and authentication remains shell-controlled", () => {
  const api = read("lib/peopleApi.ts");
  const shell = read("components/layout/AppShell.tsx");
  assert.match(api, /\/api\/me\/notifications/);
  assert.match(api, /type PeopleNotificationType = string/);
  assert.match(api, /\/api\/me\/activity\/heartbeat/);
  assert.match(api, /\/api\/admin\/user-activity/);
  assert.match(api, /apiClient/);
  assert.match(shell, /fetchCurrentAuthUser/);
  assert.match(shell, /clearAuthSession\(\)/);
  assert.match(shell, /router\.replace\("\/sign-in"\)/);
});

test("manager summary and filtered detail requests use their matching backend routes", () => {
  for (const relativePath of ["lib/auth.ts", "app/admin/admin-api.ts"]) {
    const source = read(relativePath);
    assert.match(source, /fetchManagerUserPerformance[\s\S]*?\/api\/manager\/user-performance/);
    assert.match(source, /fetchManagerPerformance[\s\S]*?\/api\/manager\/performance/);
  }
});

test("heartbeat requests never send without bearer auth and keepalive preserves API-key headers", () => {
  const source = read("lib/peopleApi.ts");
  assert.match(source, /if \(!authHeaders\.Authorization\)/);
  assert.match(source, /NEXT_PUBLIC_API_KEY/);
  assert.match(source, /"x-api-key": apiKey/);
});
