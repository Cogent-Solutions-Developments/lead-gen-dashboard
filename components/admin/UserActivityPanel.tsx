"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarDays, Loader2, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel, normalizeAuthRole } from "@/lib/auth";
import {
  fetchUserActivity,
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

function ActivityState({ user }: { user: UserActivityRecord }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.isOnline ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-700"}`}>
      <span className={`h-2 w-2 rounded-full ${user.isOnline ? "bg-emerald-600" : "bg-zinc-500"}`} aria-hidden="true" />
      {user.isOnline ? "Online" : "Offline"}
    </span>
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
        </div>
        <ActivityState user={user} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Last active</dt><dd className="mt-1 text-zinc-800">{formatDateTime(user.lastActiveAt, timezone)}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Last login</dt><dd className="mt-1 text-zinc-800">{user.lastLoginAt ? formatDateTime(user.lastLoginAt, timezone) : "No login recorded"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Screen time</dt><dd className="mt-1 font-semibold text-zinc-900">{recorded ? formatEngagedDuration(user.engagedSeconds) : "No activity recorded"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Period seen</dt><dd className="mt-1 text-zinc-800">{formatDateTime(user.firstSeenAt, timezone)} – {formatDateTime(user.lastSeenAt, timezone)}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-zinc-400">Account</dt><dd className="mt-1 font-semibold text-zinc-800">{user.isActive ? "Active" : "Inactive"}</dd></div>
      </dl>
    </article>
  );
}

export function UserActivityPanel() {
  const { isSuperAdmin, isCeo } = useAuth();
  const authorized = canMonitorUserActivity(isSuperAdmin ? "super_admin_user" : isCeo ? "ceo_user" : null);
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
  const selectedDepartment = DEPARTMENTS.find((department) => filterValue === `department:${department.id}`);
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
      const response = await fetchUserActivity({
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
  }, [authorized, date, offset, period, requestPageSize, selectedUserId]);

  useEffect(() => {
    void load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const timezone = data?.period.timezone;
  const reportWindow = useMemo(() => {
    if (!data) return "";
    return `${data.period.start} – ${data.period.end} (${data.period.timezone})`;
  }, [data]);
  const visibleUsers = useMemo(
    () =>
      selectedDepartment
        ? (data?.users || []).filter((user) => selectedDepartment.roles.some((role) => role === normalizeAuthRole(user.role)))
        : data?.users || [],
    [data?.users, selectedDepartment],
  );

  if (forbidden || !authorized) {
    return (
      <section className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <ShieldAlert className="mx-auto h-9 w-9 text-amber-700" />
        <h2 className="mt-4 text-xl font-semibold text-amber-950">Activity monitoring is restricted</h2>
        <p className="mt-2 text-sm text-amber-900">Only CEO and super-admin accounts can view this report.</p>
      </section>
    );
  }

  return (
    <div className="mt-5">
      <section aria-label="Activity report filters" className="admin-card p-4">
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
              <optgroup label="Departments">
                {DEPARTMENTS.map((department) => <option key={department.id} value={`department:${department.id}`}>{department.label}</option>)}
              </optgroup>
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

      <section className="mt-5" aria-busy={loading}>
        {loading && !data ? (
          <div className="admin-card flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading activity report…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"><p className="font-semibold text-red-900">Report unavailable</p><p className="mt-2 text-sm text-red-700">{error}</p><Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button></div>
        ) : !visibleUsers.length ? (
          <div className="admin-card border-dashed px-6 py-14 text-center"><Activity className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 font-semibold text-zinc-900">No activity recorded</p><p className="mt-1 text-sm text-zinc-500">There are no {selectedDepartment ? `${selectedDepartment.label} department ` : ""}user activity records for this reporting window.</p></div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">{visibleUsers.map((user) => <MobileUserCard key={user.userId} user={user} timezone={timezone} />)}</div>
            <div className="admin-card hidden overflow-x-auto md:block">
              <table className="w-full min-w-[74rem] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Presence</th><th className="px-4 py-3">Last active</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Screen time</th><th className="px-4 py-3">First seen</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Account</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">{visibleUsers.map((user) => { const recorded = hasRecordedUserActivity(user); return <tr key={user.userId} className="align-top"><td className="px-4 py-4"><p className="font-semibold text-zinc-950">{user.fullName || user.username}</p><p className="mt-1 text-xs text-zinc-500">@{user.username} · {getRoleLabel(user.role as never)}</p></td><td className="px-4 py-4"><ActivityState user={user} /></td><td className="px-4 py-4 text-zinc-700">{formatDateTime(user.lastActiveAt, timezone)}</td><td className="px-4 py-4 text-zinc-700"><span className="sr-only">Last login: </span>{user.lastLoginAt ? formatDateTime(user.lastLoginAt, timezone) : "No login recorded"}</td><td className="px-4 py-4 font-semibold text-zinc-900">{recorded ? formatEngagedDuration(user.engagedSeconds) : "No activity recorded"}</td><td className="px-4 py-4 text-zinc-700">{formatDateTime(user.firstSeenAt, timezone)}</td><td className="px-4 py-4 text-zinc-700">{formatDateTime(user.lastSeenAt, timezone)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-blue-100 text-blue-900" : "bg-zinc-200 text-zinc-800"}`}>{user.isActive ? "Active" : "Inactive"}</span></td></tr>; })}</tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {data?.pagination ? (
        <footer className="mt-4 flex flex-col gap-3 pb-16 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:pb-0 sm:pr-16">
          <span>{selectedDepartment ? `Showing ${visibleUsers.length} ${selectedDepartment.label} users on this result page` : `Showing ${data.pagination.total ? data.pagination.offset + 1 : 0}–${Math.min(data.pagination.offset + visibleUsers.length, data.pagination.total)} of ${data.pagination.total}`}</span>
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={loading || offset === 0} onClick={() => setOffset((current) => Math.max(0, current - requestPageSize))}>Previous</Button><Button type="button" variant="outline" disabled={loading || !data.pagination.hasMore} onClick={() => setOffset((current) => current + requestPageSize)}>Next</Button></div>
        </footer>
      ) : null}
    </div>
  );
}
