"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchManagerPerformance,
  isManagerRole,
  type ManagerPerformanceActivity,
  type ManagerPerformancePeriod,
  type ManagerPerformanceResponse,
} from "@/lib/auth";

const PERIOD_OPTIONS: Array<{ value: ManagerPerformancePeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: unknown) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString();
}

function textValue(value?: string | null, fallback = "-") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function leadName(activity: ManagerPerformanceActivity) {
  return textValue(activity.leadSnapshot?.employeeName, textValue(activity.leadIdentityKey, "Lead details unavailable"));
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-normal text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-light text-zinc-950">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{note}</p>
    </section>
  );
}

function ActivityRow({ activity }: { activity: ManagerPerformanceActivity }) {
  const snapshot = activity.leadSnapshot || { employeeName: "" };
  return (
    <article className="border-b border-zinc-100 py-4 last:border-b-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-zinc-950">{leadName(activity)}</p>
            {activity.workflowStatusLabel ? (
              <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700">
                {activity.workflowStatusLabel}
              </span>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              {activity.type.replace("-", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {textValue(snapshot.title, "No title")} {snapshot.company ? `at ${snapshot.company}` : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {activity.canonicalEventName} | By {textValue(activity.userDisplayName, activity.username)}
          </p>
          {activity.comment ? <p className="mt-2 text-sm text-zinc-700">{activity.comment}</p> : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {snapshot.email ? <span>{snapshot.email}</span> : null}
            {snapshot.phone ? <span>{snapshot.phone}</span> : null}
            {snapshot.linkedinUrl ? <span>{snapshot.linkedinUrl}</span> : null}
          </div>
        </div>
        <time className="shrink-0 text-xs font-medium text-zinc-500">{formatDateTime(activity.createdAt)}</time>
      </div>
    </article>
  );
}

export default function ManagerUserPerformancePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ManagerPerformancePeriod>("daily");
  const [date, setDate] = useState(todayValue);
  const [userId, setUserId] = useState("all");
  const [search, setSearch] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [data, setData] = useState<ManagerPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const canUseManagerView = isManagerRole(user?.role);

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchManagerPerformance({
        period,
        date,
        userId,
        search: search.trim() || undefined,
        workflowStatus: workflowStatus.trim() || undefined,
        eventKey: eventKey.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      setData(next);
    } catch (error) {
      toast.error("Manager performance failed to load", { description: getErrorMessage(error) });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, eventKey, period, search, userId, workflowStatus]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const summary = data?.summary;
  const teamUsers = data?.teamUsers || [];
  const perUserPerformance = data?.perUserPerformance || [];
  const activities = data?.activities || [];
  const windowText = useMemo(() => {
    if (!data?.period) return period;
    return `${formatDateTime(data.period.start)} - ${formatDateTime(data.period.end)} ${data.period.timezone}`;
  }, [data?.period, period]);

  return (
    <main className="min-h-[calc(100dvh-3rem)] overflow-y-auto bg-transparent p-1 font-sans">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-lg font-normal text-zinc-900">Manager Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">User Performance</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            {data?.managerScope?.persona
              ? `${data.managerScope.managerName} | ${data.managerScope.persona} department`
              : "Department activity by user, lead, status, comment, and event."}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
            {PERIOD_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={[
                  "h-9 rounded-full px-4 text-sm font-semibold transition-colors",
                  period === item.value ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-950",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="relative flex h-11 items-center rounded-full border border-zinc-200 bg-white pl-4 pr-3 text-sm text-zinc-500 shadow-sm">
            <CalendarDays className="mr-2 h-4 w-4 text-zinc-400" />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-full bg-transparent text-sm font-medium text-zinc-700 outline-none"
            />
          </label>

          <Button
            type="button"
            onClick={() => void loadPerformance()}
            disabled={loading}
            className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-600/55"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </header>

      {!canUseManagerView ? (
        <section className="mb-4 border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This page is scoped for department manager roles.
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <label className="flex h-11 items-center border border-zinc-200 bg-white px-4 text-sm text-zinc-500 shadow-sm">
          <Search className="mr-2 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads, users, comments"
            className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-700 outline-none"
          />
        </label>
        <select
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          className="h-11 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm outline-none"
        >
          <option value="all">All users</option>
          {teamUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName || item.username}
            </option>
          ))}
        </select>
        <input
          value={workflowStatus}
          onChange={(event) => setWorkflowStatus(event.target.value)}
          placeholder="workflow status"
          className="h-11 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm outline-none"
        />
        <input
          value={eventKey}
          onChange={(event) => setEventKey(event.target.value)}
          placeholder="event key"
          className="h-11 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm outline-none"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-5">
        <StatTile label="Activities" value={formatNumber(summary?.activityCount)} note={windowText} />
        <StatTile label="Touched Leads" value={formatNumber(summary?.touchedLeadCount)} note="Unique lead identities" />
        <StatTile label="Team Users" value={formatNumber(summary?.totalUsers)} note={`${formatNumber(summary?.activeUsers)} active`} />
        <StatTile label="Manual Leads" value={formatNumber(summary?.manualLeadCount)} note="Created in period" />
        <StatTile label="KPI Total" value={formatNumber(summary?.kpiTotal)} note="Department metric count" />
      </section>

      {loading && !data ? (
        <section className="mt-5 flex min-h-64 items-center justify-center border border-zinc-200 bg-white text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading manager performance...
        </section>
      ) : (
        <section className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.2fr_1fr]">
          <section className="border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-950">Team Users</h2>
                <p className="text-sm text-zinc-500">{teamUsers.length} users in scope.</p>
              </div>
              <UsersRound className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="divide-y divide-zinc-100">
              {teamUsers.length ? (
                teamUsers.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-700">
                      {(item.fullName || item.username || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-950">{item.fullName || item.username}</p>
                      <p className="truncate text-xs text-zinc-500">{item.username}</p>
                    </div>
                    <span className={item.isActive ? "text-xs font-medium text-emerald-600" : "text-xs font-medium text-zinc-400"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-center text-sm text-zinc-500">No users in this manager scope.</p>
              )}
            </div>
          </section>

          <section className="border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-950">Per-User Performance</h2>
                <p className="text-sm text-zinc-500">Totals with the leads each user touched.</p>
              </div>
              <UserRound className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="divide-y divide-zinc-100">
              {perUserPerformance.length ? (
                perUserPerformance.map((item) => (
                  <article key={item.userId} className="px-5 py-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold text-zinc-950">{item.fullName || item.username}</h3>
                        <p className="text-xs text-zinc-500">{item.username}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-right text-xs text-zinc-500">
                        <span>
                          <strong className="block text-lg font-semibold text-zinc-950">{item.totals.activityCount}</strong>
                          Activity
                        </span>
                        <span>
                          <strong className="block text-lg font-semibold text-zinc-950">{item.totals.touchedLeadCount}</strong>
                          Leads
                        </span>
                        <span>
                          <strong className="block text-lg font-semibold text-zinc-950">{item.totals.kpiCount}</strong>
                          KPI
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(item.statusCounts).length ? (
                        Object.entries(item.statusCounts).map(([label, count]) => (
                          <span key={label} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                            {label}: {count}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400">No status changes in this window.</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      {item.touchedLeads.slice(0, 6).map((lead) => (
                        <div key={`${lead.canonicalEventKey}-${lead.leadId}`} className="border border-zinc-100 bg-zinc-50 px-3 py-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-950">{textValue(lead.employeeName, lead.leadId)}</p>
                              <p className="truncate text-xs text-zinc-500">
                                {textValue(lead.title, "No title")} {lead.company ? `at ${lead.company}` : ""}
                              </p>
                              <p className="truncate text-xs text-zinc-500">{lead.canonicalEventName}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700">
                              {lead.currentWorkflowStatusLabel || lead.currentWorkflowStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-zinc-500">No performance records match this filter.</p>
              )}
            </div>
          </section>

          <section className="border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-950">Activity Details</h2>
                <p className="text-sm text-zinc-500">
                  {formatNumber(data?.pagination?.activityTotal ?? activities.length)} matching actions.
                </p>
              </div>
              <Activity className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="px-5">
              {activities.length ? (
                activities.map((activity) => <ActivityRow key={`${activity.type}-${activity.id}`} activity={activity} />)
              ) : (
                <p className="py-12 text-center text-sm text-zinc-500">No activity details for this window.</p>
              )}
            </div>
          </section>
        </section>
      )}

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-950">Window</h2>
            <Clock3 className="h-5 w-5 text-zinc-400" />
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Period</dt>
              <dd className="font-semibold text-zinc-950">{data?.period?.key || period}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Start</dt>
              <dd className="font-semibold text-zinc-950">{formatDateTime(data?.period?.start)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">End</dt>
              <dd className="font-semibold text-zinc-950">{formatDateTime(data?.period?.end)}</dd>
            </div>
          </dl>
        </div>
        <div className="border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-950">Scope</h2>
            <BriefcaseBusiness className="h-5 w-5 text-zinc-400" />
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Persona</dt>
              <dd className="font-semibold capitalize text-zinc-950">{data?.managerScope?.persona || "-"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Manager</dt>
              <dd className="font-semibold text-zinc-950">{data?.managerScope?.managerName || user?.fullName || user?.username || "-"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Returned</dt>
              <dd className="font-semibold text-zinc-950">{activities.length} activities</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
