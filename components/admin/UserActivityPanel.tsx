"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarDays, Loader2, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel, isManagerRole, normalizeAuthRole } from "@/lib/auth";
import {
  fetchManagerUserActivity,
  fetchUserActivity,
  getBrowserTimeZone,
  type UserActivityPeriod,
  type UserActivityRecord,
  type UserActivityResponse,
} from "@/lib/peopleApi";
import { canMonitorUserActivity, formatEngagedDuration, hasRecordedUserActivity } from "@/lib/peopleUtils";

const PAGE_SIZE = 25;
const PERIODS: Array<{ value: UserActivityPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const DEPARTMENTS = [
  { id: "administration", label: "Administration", roles: ["super_admin_user", "ceo_user"] },
  { id: "sales", label: "Sales", roles: ["sales_manager_user", "sales_user"] },
  { id: "delegate", label: "Delegate", roles: ["delegate_manager_user", "delegate_user"] },
  { id: "production", label: "Production", roles: ["production_manager_user", "production_user"] },
  { id: "business-operations", label: "Business Operations", roles: ["marketing_user", "operational_user", "finance_user"] },
  { id: "client", label: "Client", roles: ["client_user"] },
] as const;

function todayValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getStatus(error: unknown) {
  return (error as Error & { status?: number })?.status;
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "The activity report could not be loaded.";
}

function formatDateTime(value: string | null, timezone?: string) {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function userDisplayTimeZone(
  activityUser: UserActivityRecord,
  viewerUserId?: string,
  browserTimeZone?: string,
  reportTimeZone?: string,
) {
  if (viewerUserId && activityUser.userId === viewerUserId && browserTimeZone) {
    return browserTimeZone;
  }
  return activityUser.timeZone || reportTimeZone || browserTimeZone;
}

function ActivityState({ user }: { user: UserActivityRecord }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.isOnline ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-700"}`}>
      <span className={`h-2 w-2 rounded-full ${user.isOnline ? "bg-emerald-600" : "bg-zinc-500"}`} aria-hidden="true" />
      {user.isOnline ? "Online" : "Offline"}
    </span>
  );
}

function FrontendUsageBreakdown({ user }: { user: UserActivityRecord }) {
  const lightSeconds = Number(user.frontendUsage?.light?.engagedSeconds || 0);
  const heavySeconds = Number(user.frontendUsage?.heavy?.engagedSeconds || 0);
  const maximum = Math.max(lightSeconds, heavySeconds, 1);
  const entries = [
    { key: "light", label: "Light", seconds: lightSeconds, color: "bg-blue-500" },
    { key: "heavy", label: "Heavy", seconds: heavySeconds, color: "bg-violet-500" },
  ] as const;

  return (
    <div className="min-w-44 space-y-2" aria-label="Frontend usage">
      {entries.map((entry) => (
        <div key={entry.key}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-zinc-600">{entry.label}</span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatEngagedDuration(entry.seconds)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <span
              className={`block h-full rounded-full ${entry.color}`}
              style={{ width: `${entry.seconds ? Math.max(8, (entry.seconds / maximum) * 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
      {user.lastUsedFrontend ? (
        <p className="text-[11px] text-zinc-500">
          Last used: <span className="font-semibold capitalize text-zinc-700">{user.lastUsedFrontend}</span>
        </p>
      ) : null}
    </div>
  );
}

function MobileUserCard({ user, timezone }: { user: UserActivityRecord; timezone?: string }) {
  const recorded = hasRecordedUserActivity(user);
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-zinc-950">{user.fullName || user.username}</h2>
          <p className="truncate text-sm text-zinc-500">@{user.username} · {getRoleLabel(normalizeAuthRole(user.role))}</p>
          {timezone ? <p className="mt-1 truncate text-xs text-zinc-400">{timezone}</p> : null}
        </div>
        <ActivityState user={user} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Last active</dt><dd className="mt-1 text-zinc-800">{formatDateTime(user.lastActiveAt, timezone)}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Last login</dt><dd className="mt-1 text-zinc-800">{user.lastLoginAt ? formatDateTime(user.lastLoginAt, timezone) : "No login recorded"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Screen time</dt><dd className="mt-1 font-semibold text-zinc-900">{recorded ? formatEngagedDuration(user.engagedSeconds) : "No activity recorded"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Period seen</dt><dd className="mt-1 text-zinc-800">{formatDateTime(user.firstSeenAt, timezone)} – {formatDateTime(user.lastSeenAt, timezone)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-zinc-400">Frontend usage</dt><dd className="mt-2"><FrontendUsageBreakdown user={user} /></dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Account</dt><dd className="mt-1 font-semibold text-zinc-800">{user.isActive ? "Active" : "Inactive"}</dd></div>
      </dl>
    </article>
  );
}

export function UserActivityPanel() {
  const { user } = useAuth();
  const [browserTimeZone] = useState(getBrowserTimeZone);
  const managerView = isManagerRole(user?.role);
  const authorized = canMonitorUserActivity(user?.role);
  const [date, setDate] = useState(todayValue);
  const [period, setPeriod] = useState<UserActivityPeriod>("daily");
  const [filterValue, setFilterValue] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<UserActivityResponse | null>(null);
  const [knownUsers, setKnownUsers] = useState<Array<Pick<UserActivityRecord, "userId" | "fullName" | "username">>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const tableViewportRef = useRef<HTMLDivElement | null>(null);
  const selectedDepartment = managerView
    ? undefined
    : DEPARTMENTS.find((department) => filterValue === `department:${department.id}`);
  const selectedUserId = filterValue && !selectedDepartment ? filterValue : "";
  const requestPageSize = selectedDepartment ? 100 : PAGE_SIZE;

  const load = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      setForbidden(true);
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const fetchActivity = managerView ? fetchManagerUserActivity : fetchUserActivity;
      const response = await fetchActivity({
        date,
        period,
        userId: selectedUserId || undefined,
        limit: requestPageSize,
        offset,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setData(response);
      if (!selectedUserId) {
        setKnownUsers((current) => {
          const merged = new Map(current.map((user) => [user.userId, user]));
          response.users.forEach((user) => merged.set(user.userId, user));
          return Array.from(merged.values()).sort((left, right) =>
            (left.fullName || left.username).localeCompare(right.fullName || right.username),
          );
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (getStatus(error) === 401 || getStatus(error) === 403) setForbidden(true);
      else setError(getMessage(error));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [authorized, date, managerView, offset, period, requestPageSize, selectedUserId]);

  useEffect(() => {
    void load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const reportTimeZone = data?.period.timezone;
  const displayTimeZone = useCallback(
    (activityUser: UserActivityRecord) =>
      userDisplayTimeZone(activityUser, user?.id, browserTimeZone, reportTimeZone),
    [browserTimeZone, reportTimeZone, user?.id],
  );
  const reportWindow = useMemo(() => {
    if (!data) return "";
    const basis = data.period.aggregation === "user-local-calendar"
      ? "each user's local calendar"
      : data.period.timezone;
    return `${data.period.start} – ${data.period.end} (${basis})`;
  }, [data]);
  const visibleUsers = useMemo(
    () =>
      selectedDepartment
        ? (data?.users || []).filter((user) => selectedDepartment.roles.some((role) => role === normalizeAuthRole(user.role)))
        : data?.users || [],
    [data?.users, selectedDepartment],
  );

  useEffect(() => {
    if (!visibleUsers.length) return;
    tableViewportRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [visibleUsers]);

  if (forbidden || !authorized) {
    return (
      <section className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <ShieldAlert className="mx-auto h-9 w-9 text-amber-700" />
        <h2 className="mt-4 text-xl font-semibold text-amber-950">Activity monitoring is restricted</h2>
        <p className="mt-2 text-sm text-amber-900">Only CEO, super-admin, and department-manager accounts can view this report.</p>
      </section>
    );
  }

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
      <section aria-label="Activity report filters" className="admin-card shrink-0 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(11rem,0.8fr)_minmax(16rem,1fr)_minmax(13rem,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><CalendarDays className="h-3.5 w-3.5" /> Report date</span>
            <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setOffset(0); }} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-zinc-600">Reporting period</legend>
            <div className="flex rounded-lg border border-zinc-200 p-1">
              {PERIODS.map((option) => <button key={option.value} type="button" aria-pressed={period === option.value} onClick={() => { setPeriod(option.value); setOffset(0); }} className={`h-9 flex-1 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${period === option.value ? "bg-blue-600 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}>{option.label}</button>)}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><UserRound className="h-3.5 w-3.5" /> User filter</span>
            <select value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setOffset(0); }} className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="">All users</option>
              {!managerView ? (
                <optgroup label="Departments">
                  {DEPARTMENTS.map((department) => <option key={department.id} value={`department:${department.id}`}>{department.label}</option>)}
                </optgroup>
              ) : null}
              <optgroup label="Individual users">
                {knownUsers.map((user) => <option key={user.userId} value={user.userId}>{user.fullName || user.username} (@{user.username})</option>)}
              </optgroup>
            </select>
          </label>
          <Button type="button" onClick={() => void load()} disabled={loading} className="h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
        {reportWindow ? <p className="mt-3 text-xs text-zinc-500">Reporting window: {reportWindow}</p> : null}
      </section>

      <section className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] md:overflow-hidden [&::-webkit-scrollbar]:hidden" aria-busy={loading}>
        {loading && !data ? (
          <div className="admin-card flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading activity report…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-900">Report unavailable</p><p className="mt-2 text-sm text-red-700">{error}</p><Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button></div>
        ) : !visibleUsers.length ? (
          <div className="admin-card border-dashed px-6 py-14 text-center"><Activity className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 font-semibold text-zinc-900">No activity recorded</p><p className="mt-1 text-sm text-zinc-500">There are no {selectedDepartment ? `${selectedDepartment.label} department ` : ""}user activity records for this reporting window.</p></div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {visibleUsers.map((activityUser) => (
                <MobileUserCard
                  key={activityUser.userId}
                  user={activityUser}
                  timezone={displayTimeZone(activityUser)}
                />
              ))}
            </div>
            <div
              ref={tableViewportRef}
              className="admin-card hidden min-h-0 flex-1 snap-y snap-mandatory scroll-pt-10 overflow-auto overscroll-contain [scrollbar-width:none] md:block [&::-webkit-scrollbar]:hidden"
            >
              <table className="w-full min-w-[86rem] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 shadow-[0_1px_0_rgba(228,228,231,1)]"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Presence</th><th className="px-4 py-3">Last active</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Screen time</th><th className="px-4 py-3">Frontend usage</th><th className="px-4 py-3">First seen</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Account</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {visibleUsers.map((activityUser) => {
                    const recorded = hasRecordedUserActivity(activityUser);
                    const timezone = displayTimeZone(activityUser);
                    return (
                      <tr key={activityUser.userId} className="snap-start snap-always align-top [&>td]:py-3">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-zinc-950">{activityUser.fullName || activityUser.username}</p>
                          <p className="mt-1 text-xs text-zinc-500">@{activityUser.username} · {getRoleLabel(activityUser.role as never)}</p>
                          {timezone ? <p className="mt-1 text-xs text-zinc-400">{timezone}</p> : null}
                        </td>
                        <td className="px-4 py-4"><ActivityState user={activityUser} /></td>
                        <td className="px-4 py-4 text-zinc-700">{formatDateTime(activityUser.lastActiveAt, timezone)}</td>
                        <td className="px-4 py-4 text-zinc-700"><span className="sr-only">Last login: </span>{activityUser.lastLoginAt ? formatDateTime(activityUser.lastLoginAt, timezone) : "No login recorded"}</td>
                        <td className="px-4 py-4 font-semibold text-zinc-900">{recorded ? formatEngagedDuration(activityUser.engagedSeconds) : "No activity recorded"}</td>
                        <td className="px-4 py-4"><FrontendUsageBreakdown user={activityUser} /></td>
                        <td className="px-4 py-4 text-zinc-700">{formatDateTime(activityUser.firstSeenAt, timezone)}</td>
                        <td className="px-4 py-4 text-zinc-700">{formatDateTime(activityUser.lastSeenAt, timezone)}</td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${activityUser.isActive ? "bg-blue-100 text-blue-900" : "bg-zinc-200 text-zinc-800"}`}>{activityUser.isActive ? "Active" : "Inactive"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {data?.pagination ? (
        <footer className="mt-4 flex shrink-0 flex-col gap-3 pb-16 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:pb-0 sm:pr-16">
          <span>{selectedDepartment ? `Showing ${visibleUsers.length} ${selectedDepartment.label} users on this result page` : `Showing ${data.pagination.total ? data.pagination.offset + 1 : 0}–${Math.min(data.pagination.offset + visibleUsers.length, data.pagination.total)} of ${data.pagination.total}`}</span>
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={loading || offset === 0} onClick={() => setOffset((current) => Math.max(0, current - requestPageSize))}>Previous</Button><Button type="button" variant="outline" disabled={loading || !data.pagination.hasMore} onClick={() => setOffset((current) => current + requestPageSize)}>Next</Button></div>
        </footer>
      ) : null}
    </div>
  );
}
