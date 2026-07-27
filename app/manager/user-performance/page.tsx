"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Loader2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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

const PERFORMANCE_CARD_CLASS =
  "rounded-lg border border-zinc-200/80 bg-white/95 shadow-[0_22px_46px_-38px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]";

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

function activityTypeLabel(value?: string | null) {
  const normalized = textValue(value, "Activity").toLowerCase().replaceAll("_", "-");
  if (normalized === "workflow-status") return "Status";
  return normalized.replaceAll("-", " ");
}

function statusTextClass(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
  const classes: Record<string, string> = {
    new: "text-cyan-500",
    "first-call": "text-blue-600",
    "follow-up": "text-orange-500",
    "proposal-sent": "text-purple-600",
    "deal-closed": "text-emerald-600",
    "deal-dead": "text-red-600",
    "email-sent": "text-blue-600",
    "whatsapp-sent": "text-emerald-600",
    "1st-follow-up": "text-orange-500",
    "2nd-follow-up": "text-amber-500",
    "3rd-follow-up": "text-orange-600",
    pending: "text-purple-600",
    declined: "text-red-600",
    confirmed: "text-emerald-600",
  };
  return classes[normalized] || "text-zinc-500";
}

function SummaryMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/70 px-4 py-3">
      <p className="text-[11px] font-semibold text-zinc-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <strong className="text-2xl font-semibold tracking-tight text-slate-950">{value}</strong>
        {note ? <span className="truncate text-xs text-zinc-500">{note}</span> : null}
      </div>
    </div>
  );
}

function PerformanceMixSection({
  activity,
  leads,
  manual,
  kpi,
}: {
  activity?: number;
  leads?: number;
  manual?: number;
  kpi?: number;
}) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const metrics = [
    { name: "Activity", value: Number(activity || 0), color: "#2563eb" },
    { name: "Leads", value: Number(leads || 0), color: "#8b5cf6" },
    { name: "Manual", value: Number(manual || 0), color: "#10b981" },
    { name: "KPI", value: Number(kpi || 0), color: "#f59e0b" },
  ];
  const chartData = metrics.filter((item) => item.value > 0);
  const total = metrics.reduce((sum, item) => sum + item.value, 0);
  const visibleData = chartData.length
    ? chartData
    : [{ name: "No activity", value: 1, color: "#e4e4e7" }];
  const activeName = hoveredMetric || selectedMetric;
  const activeMetric = metrics.find((item) => item.name === activeName) || null;
  const activeValue = activeMetric?.value ?? total;
  const activePercentage = activeMetric && total ? Math.round((activeMetric.value / total) * 100) : null;

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.9)] sm:p-6"
      aria-labelledby="performance-mix-title"
    >
      <h4 id="performance-mix-title" className="text-sm font-semibold text-white">
        Performance mix
      </h4>
      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(20rem,1.1fr)] lg:items-center">
        <div
          className="relative mx-auto h-[clamp(16rem,60vw,24rem)] w-full min-w-0 max-w-[32rem]"
          role="img"
          aria-label={`Performance mix: ${metrics.map((item) => `${item.name} ${item.value}`).join(", ")}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="value"
                nameKey="name"
                innerRadius="53%"
                outerRadius="82%"
                paddingAngle={chartData.length > 1 ? 3 : 0}
                cornerRadius={7}
                stroke="none"
              >
                {visibleData.map((item) => (
                  <Cell
                    key={item.name}
                    fill={item.color}
                    className="cursor-pointer transition-opacity"
                    opacity={activeName && activeName !== item.name ? 0.3 : 1}
                    onMouseEnter={() => setHoveredMetric(item.name)}
                    onMouseLeave={() => setHoveredMetric(null)}
                    onClick={() =>
                      setSelectedMetric((current) => (current === item.name ? null : item.name))
                    }
                  />
                ))}
              </Pie>
              {chartData.length ? (
                <Tooltip
                  formatter={(value, name) => {
                    const metric = metrics.find((item) => item.name === name);
                    const percentage = metric && total ? Math.round((metric.value / total) * 100) : 0;
                    return [`${formatNumber(value)} · ${percentage}%`, name];
                  }}
                  contentStyle={{
                    borderRadius: "10px",
                    borderColor: "#e4e4e7",
                    boxShadow: "0 12px 30px -18px rgba(15, 23, 42, 0.45)",
                    fontSize: "12px",
                  }}
                />
              ) : null}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <strong className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {formatNumber(activeValue)}
            </strong>
            <span className="mt-1 max-w-24 truncate text-xs font-semibold text-slate-300">
              {activeMetric?.name || "Total"}
            </span>
            {activePercentage != null ? (
              <span className="mt-0.5 text-xs font-medium text-slate-500">{activePercentage}%</span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3" aria-label="Performance metrics">
          {metrics.map((item) => {
            const percentage = total ? Math.round((item.value / total) * 100) : 0;
            const active = activeName === item.name;
            return (
              <button
                key={item.name}
                type="button"
                aria-pressed={selectedMetric === item.name}
                onClick={() =>
                  setSelectedMetric((current) => (current === item.name ? null : item.name))
                }
                onMouseEnter={() => setHoveredMetric(item.name)}
                onMouseLeave={() => setHoveredMetric(null)}
                onFocus={() => setHoveredMetric(item.name)}
                onBlur={() => setHoveredMetric(null)}
                className={[
                  "min-w-0 rounded-xl border bg-white/[0.055] p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-4",
                  active
                    ? "border-white/40 bg-white/[0.1] shadow-[0_18px_36px_-24px_rgba(0,0,0,0.8)]"
                    : "border-white/10 hover:border-white/25 hover:bg-white/[0.08]",
                ].join(" ")}
                style={active ? { borderColor: item.color } : undefined}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-xs font-semibold text-slate-300">{item.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-slate-500">{percentage}%</span>
                </span>
                <strong className="mt-3 block text-2xl font-semibold tabular-nums tracking-tight text-white sm:text-3xl">
                  {formatNumber(item.value)}
                </strong>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ActivityRow({ activity }: { activity: ManagerPerformanceActivity }) {
  const snapshot = activity.leadSnapshot || { employeeName: "" };
  const commentAuthor = textValue(
    activity.commentUpdatedByUserDisplayName,
    textValue(activity.commentUpdatedByUsername, textValue(activity.userDisplayName, activity.username))
  );

  return (
    <article className="relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <span className="absolute left-0 top-4 h-9 w-1 rounded-r-full bg-blue-600" aria-hidden="true" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="truncate text-sm font-semibold text-slate-950">{leadName(activity)}</p>
            <span className="text-xs font-semibold text-blue-700">{activityTypeLabel(activity.type)}</span>
            {activity.workflowStatusLabel ? (
              <span className={`text-xs font-semibold ${statusTextClass(activity.workflowStatus)}`}>
                {activity.workflowStatusLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {textValue(snapshot.title, "No title")} {snapshot.company ? `at ${snapshot.company}` : ""}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {activity.canonicalEventName} · {textValue(activity.userDisplayName, activity.username)}
          </p>
          {activity.comment ? (
            <aside
              className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 shadow-[inset_3px_0_0_#2563eb]"
              aria-label="KPI comment"
            >
              <p className="text-sm font-semibold leading-5 text-slate-950">{activity.comment}</p>
              <p className="mt-1 text-xs font-medium text-blue-700">
                By {commentAuthor} · {formatDateTime(activity.commentUpdatedAt || activity.createdAt)}
                {(activity.commentHistoryCount || 0) > 1
                  ? ` · ${activity.commentHistoryCount} comments in history`
                  : ""}
              </p>
            </aside>
          ) : null}
          {snapshot.email || snapshot.phone ? (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              {snapshot.email ? <span>{snapshot.email}</span> : null}
              {snapshot.phone ? <span>{snapshot.phone}</span> : null}
            </div>
          ) : null}
        </div>
        <time className="shrink-0 text-xs font-semibold text-zinc-400">
          {formatDateTime(activity.createdAt)}
        </time>
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
  const selectedTeamUser =
    userId === "all" ? null : teamUsers.find((item) => item.id === userId) || null;
  const selectedPerformance =
    userId === "all"
      ? null
      : perUserPerformance.find((item) => item.userId === userId) || null;
  const selectedActivityCount = selectedPerformance?.totals.activityCount ?? summary?.activityCount;
  const selectedTouchedLeadCount =
    selectedPerformance?.totals.touchedLeadCount ?? summary?.touchedLeadCount;
  const selectedManualLeadCount =
    selectedPerformance?.totals.manualLeadCount ?? summary?.manualLeadCount;
  const selectedKpiCount = selectedPerformance?.totals.kpiCount ?? summary?.kpiTotal;

  return (
    <main className="mx-auto min-h-[calc(100dvh-3rem)] w-full max-w-[112rem] overflow-x-hidden overflow-y-auto bg-transparent font-sans sm:p-1">
      <header className={`${PERFORMANCE_CARD_CLASS} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              User Performance
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
              <span>
                {data?.managerScope?.persona
                  ? `${data.managerScope.managerName} · ${data.managerScope.persona} department`
                  : "Department performance and lead activity"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                <CalendarDays className="h-3.5 w-3.5" />
                {windowText}
              </span>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:flex xl:flex-wrap xl:items-center xl:justify-end">
            <div className="col-span-full grid min-w-0 grid-cols-4 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm xl:col-span-1">
              {PERIOD_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={[
                    "h-9 min-w-0 rounded-md px-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                    period === item.value
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "text-zinc-500 hover:bg-blue-50 hover:text-blue-700",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="relative flex h-11 min-w-0 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 shadow-sm">
              <CalendarDays className="mr-2 h-4 w-4 text-zinc-400" />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-700 outline-none"
              />
            </label>

            <Button
              type="button"
              onClick={() => void loadPerformance()}
              disabled={loading}
              className="h-11 min-w-0 rounded-lg border border-blue-500/20 bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:bg-blue-600/55 sm:px-5"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-3 md:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <SummaryMetric label="Activities" value={formatNumber(summary?.activityCount)} />
          <SummaryMetric label="Touched leads" value={formatNumber(summary?.touchedLeadCount)} />
          <SummaryMetric
            label="Active users"
            value={formatNumber(summary?.activeUsers)}
            note={`of ${formatNumber(summary?.totalUsers)}`}
          />
          <SummaryMetric label="Manual leads" value={formatNumber(summary?.manualLeadCount)} />
          <SummaryMetric label="KPI total" value={formatNumber(summary?.kpiTotal)} />
        </div>
      </header>

      {!canUseManagerView ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This page is scoped for department manager roles.
        </section>
      ) : null}

      <section className={`${PERFORMANCE_CARD_CLASS} mt-4 p-3 sm:mt-5 sm:p-4`} aria-label="Performance filters">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
          <label className="flex h-11 items-center rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 text-sm text-zinc-500 transition-colors focus-within:border-blue-300 focus-within:bg-white">
            <Search className="mr-2 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads, users, or comments"
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-700 outline-none"
            />
          </label>
          <input
            value={workflowStatus}
            onChange={(event) => setWorkflowStatus(event.target.value)}
            placeholder="Filter by status"
            className="h-11 rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-blue-300 focus:bg-white"
          />
          <input
            value={eventKey}
            onChange={(event) => setEventKey(event.target.value)}
            placeholder="Filter by event"
            className="h-11 rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-blue-300 focus:bg-white"
          />
        </div>
      </section>

      {loading && !data ? (
        <section
          className={`${PERFORMANCE_CARD_CLASS} mt-5 flex min-h-64 items-center justify-center text-sm text-zinc-500`}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading manager performance...
        </section>
      ) : (
        <section className={`${PERFORMANCE_CARD_CLASS} mt-5 overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Department Performance</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Select a team member to focus the same report and activity data.
              </p>
            </div>
            <Activity className="h-5 w-5 text-zinc-400" />
          </div>

          <div className="grid overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside
              className="border-b border-zinc-100 bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r"
              aria-label="Team users"
            >
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:max-h-[54rem] lg:flex-col lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  aria-pressed={userId === "all"}
                  onClick={() => setUserId("all")}
                  className={[
                    "inline-flex min-w-52 items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors lg:w-full lg:min-w-0",
                    userId === "all"
                      ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                      : "border-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700",
                  ].join(" ")}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <UsersRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate">All team members</span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500">
                      {formatNumber(summary?.activeUsers)} active of {formatNumber(summary?.totalUsers)}
                    </span>
                  </span>
                </button>

                {teamUsers.map((item) => {
                  const selected = userId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setUserId(item.id)}
                      className={[
                        "inline-flex min-w-52 items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:w-full lg:min-w-0",
                        selected
                          ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                          : "border-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold shadow-sm",
                          selected
                            ? "bg-blue-600 text-white"
                            : "border border-zinc-200 bg-white text-zinc-700",
                        ].join(" ")}
                      >
                        {(item.fullName || item.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">{item.fullName || item.username}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-normal text-zinc-500">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              item.isActive ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                            aria-hidden="true"
                          />
                          {item.username}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0 p-3 sm:p-4">
              <div className="border-b border-zinc-100 pb-4">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                    {selectedTeamUser?.fullName ||
                      selectedTeamUser?.username ||
                      data?.managerScope?.persona ||
                      "Team performance"}
                  </h3>
                  {selectedTeamUser ? (
                    <p className="mt-1 truncate text-sm text-zinc-500">@{selectedTeamUser.username}</p>
                  ) : null}
                </div>
              </div>

              <PerformanceMixSection
                activity={selectedActivityCount}
                leads={selectedTouchedLeadCount}
                manual={selectedManualLeadCount}
                kpi={selectedKpiCount}
              />

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-1 sm:px-4">
                {perUserPerformance.length ? (
                  perUserPerformance.map((item, index) => (
                    <article key={item.userId} className="border-b border-zinc-100 py-4 last:border-b-0">
                      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(12rem,1fr)_5rem_5rem_5rem] sm:items-center sm:gap-4">
                        <span className="text-sm font-bold tabular-nums text-zinc-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {item.fullName || item.username}
                          </h3>
                          <p className="mt-1 truncate text-xs text-zinc-500">@{item.username}</p>
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 sm:contents">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Activity</p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatNumber(item.totals.activityCount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Leads</p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatNumber(item.totals.touchedLeadCount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">KPI</p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatNumber(item.totals.kpiCount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {Object.entries(item.statusCounts).length ? (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-50 pt-3 text-xs text-zinc-500">
                          {Object.entries(item.statusCounts).map(([label, count]) => (
                            <span key={label}>
                              {label} <strong className="ml-1 text-slate-900">{count}</strong>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {item.touchedLeads.length ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {item.touchedLeads.slice(0, 4).map((lead) => (
                            <div
                              key={`${lead.canonicalEventKey}-${lead.leadId}`}
                              className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {textValue(lead.employeeName, lead.leadId)}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-zinc-500">
                                    {textValue(lead.title, "No title")}
                                    {lead.company ? ` · ${lead.company}` : ""}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-zinc-400">
                                    {lead.canonicalEventName}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-semibold ${statusTextClass(
                                    lead.currentWorkflowStatus
                                  )}`}
                                >
                                  {lead.currentWorkflowStatusLabel || lead.currentWorkflowStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="py-12 text-center text-sm text-zinc-500">
                    No performance records match these filters.
                  </p>
                )}
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recent activity and comments</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatNumber(data?.pagination?.activityTotal ?? activities.length)} matching actions
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-zinc-400" />
                </div>

                {activities.length ? (
                  <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-2 scrollbar-modern">
                    {activities.map((activity) => (
                      <ActivityRow
                        key={`${activity.type || "activity"}-${activity.id}`}
                        activity={activity}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-5 py-12 text-center text-sm text-zinc-500">
                    No activity details for this window.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
