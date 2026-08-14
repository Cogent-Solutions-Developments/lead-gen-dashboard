"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchManagerPerformance,
  isManagerRole,
  type ManagerPerformanceActivity,
  type ManagerPerformancePeriod,
  type ManagerPerformanceResponse,
} from "@/lib/auth";
import {
  fetchManagerUserActivity,
} from "@/lib/peopleApi";
import { formatEngagedDuration } from "@/lib/peopleUtils";
import { PeriodDatePicker, anchorDateForPeriod } from "@/components/performance/PeriodDatePicker";
import { activePerformanceSummary, managerActivityAttribution } from "@/lib/managerPerformance";
import { formatUsd } from "@/lib/leadWorkflowHistory";

const PERIOD_OPTIONS: Array<{ value: ManagerPerformancePeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const PERFORMANCE_CARD_CLASS =
  "rounded-lg border border-zinc-200/80 bg-white/95 shadow-[0_22px_46px_-38px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]";

type VersionUsage = { light: number; heavy: number };
type VersionUsageByUser = Record<string, VersionUsage>;
type PerformanceSection = "overview" | "members" | "activity";

const PERFORMANCE_SECTIONS = [
  { id: "overview" as const, label: "Overview", icon: BarChart3 },
  { id: "members" as const, label: "Members", icon: UsersRound },
  { id: "activity" as const, label: "Activity", icon: Activity },
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

async function fetchManagerVersionUsage(
  dateValue: string,
  period: ManagerPerformancePeriod
): Promise<VersionUsageByUser> {
  const year = Number(dateValue.slice(0, 4)) || new Date().getFullYear();
  const windows =
    period === "yearly"
      ? Array.from({ length: 12 }, (_, index) => ({
          date: `${year}-${String(index + 1).padStart(2, "0")}-01`,
          period: "monthly" as const,
        }))
      : [{ date: dateValue, period }];
  const responses = await Promise.all(
    windows.map((window) =>
      fetchManagerUserActivity({
        date: window.date,
        period: window.period,
        limit: 500,
        offset: 0,
      })
    )
  );

  return responses.reduce<VersionUsageByUser>((usageByUser, response) => {
    response.users.forEach((item) => {
      const current = usageByUser[item.userId] || { light: 0, heavy: 0 };
      usageByUser[item.userId] = {
        light: current.light + Number(item.frontendUsage?.light?.engagedSeconds || 0),
        heavy: current.heavy + Number(item.frontendUsage?.heavy?.engagedSeconds || 0),
      };
    });
    return usageByUser;
  }, {});
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

function PerformanceChartSection({
  activity,
  leads,
  manual,
  kpi,
  revenueUsd,
  lightSeconds,
  heavySeconds,
}: {
  activity?: number;
  leads?: number;
  manual?: number;
  kpi?: number;
  revenueUsd?: number;
  lightSeconds?: number;
  heavySeconds?: number;
}) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const metrics = [
    { name: "Activity", value: Number(activity || 0), color: "#2563eb" },
    { name: "Leads", value: Number(leads || 0), color: "#8b5cf6" },
    { name: "Manual", value: Number(manual || 0), color: "#10b981" },
    { name: "KPI", value: Number(kpi || 0), color: "#f59e0b" },
  ];
  const versions = [
    { name: "Light", value: Number(lightSeconds || 0), color: "#2563eb" },
    { name: "Heavy", value: Number(heavySeconds || 0), color: "#8b5cf6" },
  ];
  const versionTotal = versions.reduce((sum, item) => sum + item.value, 0);
  const versionData = versionTotal
    ? versions
    : [{ name: "No usage", value: 1, color: "#e4e4e7" }];
  const activeVersion = versions.find((item) => item.name === selectedVersion) || null;

  return (
    <section
      className="h-full min-h-[22rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_26px_60px_-42px_rgba(37,99,235,0.38),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-4"
      aria-label="Performance and system usage"
    >
      <div className="grid h-full min-h-0 gap-3 xl:grid-cols-2">
        <article className="flex min-h-[18rem] min-w-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Performance</h3>
            {Number(revenueUsd || 0) > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <DollarSign className="h-3.5 w-3.5" />
                Revenue {formatUsd(revenueUsd)}
              </span>
            ) : null}
          </div>
          <div
            className="mt-3 min-h-60 min-w-0 flex-1"
            role="img"
            aria-label={`Performance: ${metrics.map((item) => `${item.name} ${item.value}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 5" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: "#eff6ff", radius: 8 }}
                  formatter={(value) => [formatNumber(value), ""]}
                  contentStyle={{
                    borderRadius: "10px",
                    borderColor: "#dbeafe",
                    boxShadow: "0 14px 30px -20px rgba(37, 99, 235, 0.55)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[7, 7, 2, 2]} maxBarSize={62}>
                  {metrics.map((item) => (
                    <Cell
                      key={item.name}
                      fill={item.color}
                      className="cursor-pointer transition-opacity"
                      opacity={selectedMetric && selectedMetric !== item.name ? 0.28 : 1}
                      onClick={() =>
                        setSelectedMetric((current) => (current === item.name ? null : item.name))
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="flex min-h-[18rem] min-w-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 sm:p-4">
          <h3 className="text-sm font-semibold text-slate-900">System usage</h3>
          <div className="grid min-h-60 flex-1 items-center gap-2 sm:grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.7fr)]">
            <div
              className="relative mx-auto h-full min-h-56 w-full max-w-md"
              role="img"
              aria-label={`System usage: Light ${formatEngagedDuration(versions[0].value)}, Heavy ${formatEngagedDuration(versions[1].value)}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={versionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={versionTotal ? 4 : 0}
                    cornerRadius={8}
                    stroke="none"
                  >
                    {versionData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                        className="cursor-pointer transition-opacity"
                        opacity={selectedVersion && selectedVersion !== item.name ? 0.28 : 1}
                        onClick={() => {
                          if (item.name === "No usage") return;
                          setSelectedVersion((current) =>
                            current === item.name ? null : item.name
                          );
                        }}
                      />
                    ))}
                  </Pie>
                  {versionTotal ? (
                    <Tooltip
                      formatter={(value, name) => [
                        formatEngagedDuration(Number(value || 0)),
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: "10px",
                        borderColor: "#dbeafe",
                        boxShadow: "0 14px 30px -20px rgba(37, 99, 235, 0.55)",
                        fontSize: "12px",
                      }}
                    />
                  ) : null}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="max-w-28 truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  {formatEngagedDuration(activeVersion?.value ?? versionTotal)}
                </strong>
                <span className="mt-1 text-[11px] font-semibold text-zinc-500">
                  {activeVersion?.name || "Total"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1" aria-label="System usage totals">
              {versions.map((item) => {
                const percentage = versionTotal
                  ? Math.round((item.value / versionTotal) * 100)
                  : 0;
                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={selectedVersion === item.name}
                    onClick={() =>
                      setSelectedVersion((current) => (current === item.name ? null : item.name))
                    }
                    className={[
                      "min-w-0 rounded-xl border bg-white p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      selectedVersion === item.name
                        ? "border-blue-300 shadow-[0_16px_30px_-24px_rgba(37,99,235,0.6)]"
                        : "border-zinc-200 hover:border-blue-200",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      {item.name}
                      <span className="ml-auto text-zinc-400">{percentage}%</span>
                    </span>
                    <strong className="mt-2 block truncate text-base font-semibold tabular-nums text-slate-950">
                      {formatEngagedDuration(item.value)}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        </article>
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
  const revenue = formatUsd(activity.dealAmountUsd);

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
            {revenue ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{revenue}</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {textValue(snapshot.title, "No title")} {snapshot.company ? `at ${snapshot.company}` : ""}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {activity.canonicalEventName} · {managerActivityAttribution(activity)}
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
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<PerformanceSection>("overview");
  const [data, setData] = useState<ManagerPerformanceResponse | null>(null);
  const [versionUsageByUser, setVersionUsageByUser] = useState<VersionUsageByUser>({});
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

  const loadVersionUsage = useCallback(async () => {
    try {
      setVersionUsageByUser(await fetchManagerVersionUsage(date, period));
    } catch (error) {
      toast.error("System usage failed to load", { description: getErrorMessage(error) });
      setVersionUsageByUser({});
    }
  }, [date, period]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    void loadVersionUsage();
  }, [loadVersionUsage]);

  const summary = data?.summary;
  const activeData = useMemo(() => activePerformanceSummary(data), [data]);
  const teamUsers = activeData.users;
  const perUserPerformance = activeData.performance;
  const activeUserIds = useMemo(() => new Set(teamUsers.map((item) => item.id)), [teamUsers]);
  const activities = useMemo(
    () => (data?.activities || []).filter((activity) => activeUserIds.has(activity.userId)),
    [activeUserIds, data?.activities]
  );
  useEffect(() => {
    if (userId !== "all" && !teamUsers.some((item) => item.id === userId)) setUserId("all");
  }, [teamUsers, userId]);
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
  const activeTotals = useMemo(
    () => perUserPerformance.reduce(
      (totals, item) => ({
        activity: totals.activity + Number(item.totals.activityCount || 0),
        leads: totals.leads + Number(item.totals.touchedLeadCount || 0),
        manual: totals.manual + Number(item.totals.manualLeadCount || 0),
        kpi: totals.kpi + Number(item.totals.kpiCount || 0),
        revenue: totals.revenue + Number(item.totals.revenueUsd || 0),
      }),
      { activity: 0, leads: 0, manual: 0, kpi: 0, revenue: 0 }
    ),
    [perUserPerformance]
  );
  const selectedActivityCount = selectedPerformance?.totals.activityCount ?? activeTotals.activity;
  const selectedTouchedLeadCount = selectedPerformance?.totals.touchedLeadCount ?? activeTotals.leads;
  const selectedManualLeadCount = selectedPerformance?.totals.manualLeadCount ?? activeTotals.manual;
  const selectedKpiCount = selectedPerformance?.totals.kpiCount ?? activeTotals.kpi;
  const selectedRevenueUsd = selectedPerformance?.totals.revenueUsd ?? activeTotals.revenue;
  const isSalesPerformance = data?.managerScope?.persona === "sales";
  const versionUsage = useMemo(
    () => {
      if (userId !== "all") return versionUsageByUser[userId] || { light: 0, heavy: 0 };
      return Object.entries(versionUsageByUser).reduce(
        (totals, item) => ({
          light: totals.light + (activeUserIds.has(item[0]) ? item[1].light : 0),
          heavy: totals.heavy + (activeUserIds.has(item[0]) ? item[1].heavy : 0),
        }),
        { light: 0, heavy: 0 }
      );
    },
    [activeUserIds, userId, versionUsageByUser]
  );

  return (
    <main className="mx-auto flex h-[calc(100dvh-3rem)] min-h-0 w-full max-w-[112rem] flex-col overflow-hidden bg-transparent font-sans sm:p-1">
      <header className={`${PERFORMANCE_CARD_CLASS} shrink-0 p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              User Performance
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
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
                  onClick={() => {
                    setPeriod(item.value);
                    setDate((current) => anchorDateForPeriod(current, item.value));
                  }}
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

            <PeriodDatePicker period={period} value={date} onChange={setDate} />

            <Button
              type="button"
              onClick={() => {
                void loadPerformance();
                void loadVersionUsage();
              }}
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

      </header>

      {!canUseManagerView ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          This page is scoped for department manager roles.
        </section>
      ) : null}

      {loading && !data ? (
        <section
          className={`${PERFORMANCE_CARD_CLASS} mt-5 flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-500`}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading manager performance...
        </section>
      ) : (
        <section
          className={`${PERFORMANCE_CARD_CLASS} mt-5 flex min-h-0 flex-1 flex-col overflow-hidden`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-slate-950">Department Performance</h2>
            <button
              type="button"
              aria-label="Toggle performance filters"
              aria-controls="department-performance-filters"
              aria-expanded={filterPanelOpen}
              title="Filters"
              onClick={() => setFilterPanelOpen((current) => !current)}
              className={[
                "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                filterPanelOpen || search || workflowStatus || eventKey
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-blue-200 hover:text-blue-700",
              ].join(" ")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {search || workflowStatus || eventKey ? (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </div>

          {filterPanelOpen ? (
            <div
              id="department-performance-filters"
              className="grid gap-3 border-b border-zinc-100 bg-zinc-50/65 p-3 sm:p-4 lg:grid-cols-[1.4fr_1fr_1fr]"
            >
              <label className="flex h-11 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-500 transition-colors focus-within:border-blue-300">
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
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-blue-300"
              />
              <input
                value={eventKey}
                onChange={(event) => setEventKey(event.target.value)}
                placeholder="Filter by event"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-blue-300"
              />
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
            <aside
              className="min-h-0 overflow-hidden border-b border-zinc-100 bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r"
              aria-label="Team users"
            >
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:h-full lg:min-h-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1 lg:scrollbar-modern [&::-webkit-scrollbar]:hidden lg:[&::-webkit-scrollbar]:block">
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
                      <UserAvatar
                        user={item}
                        size="md"
                        className={[
                          "!h-9 !w-9 !rounded-lg shadow-sm",
                          selected
                            ? "!border-blue-600 !bg-blue-600 !text-white"
                            : "!border-zinc-200 !bg-white !text-zinc-700",
                        ].join(" ")}
                      />
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

            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-3 sm:p-4">
              {selectedTeamUser ? (
                <div className="shrink-0 border-b border-zinc-100 pb-4">
                  <h3 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                    {selectedTeamUser.fullName || selectedTeamUser.username}
                  </h3>
                  <p className="mt-1 truncate text-sm text-zinc-500">@{selectedTeamUser.username}</p>
                </div>
              ) : null}

              <nav
                className="mt-4 flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-zinc-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Performance sections"
              >
                {PERFORMANCE_SECTIONS.map((section, index) => {
                  const Icon = section.icon;
                  const selected = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      id={`performance-tab-${section.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`performance-panel-${section.id}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActiveSection(section.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                        event.preventDefault();
                        const direction = event.key === "ArrowRight" ? 1 : -1;
                        const nextIndex =
                          (index + direction + PERFORMANCE_SECTIONS.length) %
                          PERFORMANCE_SECTIONS.length;
                        const nextSection = PERFORMANCE_SECTIONS[nextIndex];
                        setActiveSection(nextSection.id);
                        document.getElementById(`performance-tab-${nextSection.id}`)?.focus();
                      }}
                      className={[
                        "relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                        selected
                          ? "text-blue-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-600"
                          : "text-zinc-500 hover:bg-blue-50/60 hover:text-blue-700",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-modern">
              {activeSection === "overview" ? (
                <div
                  id="performance-panel-overview"
                  role="tabpanel"
                  aria-labelledby="performance-tab-overview"
                  className="h-full min-h-[22rem] py-4"
                >
                  <PerformanceChartSection
                    activity={selectedActivityCount}
                    leads={selectedTouchedLeadCount}
                    manual={selectedManualLeadCount}
                    kpi={selectedKpiCount}
                    revenueUsd={selectedRevenueUsd}
                    lightSeconds={versionUsage.light}
                    heavySeconds={versionUsage.heavy}
                  />
                </div>
              ) : null}

              {activeSection === "members" ? (
              <div
                id="performance-panel-members"
                role="tabpanel"
                aria-labelledby="performance-tab-members"
                className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-1 sm:px-4"
              >
                {perUserPerformance.length ? (
                  perUserPerformance.map((item, index) => (
                    <article key={item.userId} className="border-b border-zinc-100 py-4 last:border-b-0">
                      <div className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:items-center sm:gap-4 ${isSalesPerformance ? "sm:grid-cols-[2.5rem_minmax(12rem,1fr)_5rem_5rem_5rem_7rem]" : "sm:grid-cols-[2.5rem_minmax(12rem,1fr)_5rem_5rem_5rem]"}`}>
                        <span className="text-sm font-bold tabular-nums text-zinc-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {item.fullName || item.username}
                          </h3>
                          <p className="mt-1 truncate text-xs text-zinc-500">@{item.username}</p>
                        </div>
                        <div className={`col-span-2 grid gap-2 border-t border-zinc-100 pt-3 sm:contents ${isSalesPerformance ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Activity</p>
                            <p className="mt-1 text-base font-bold text-slate-950">
                              {formatNumber(item.totals.activityCount)}
                            </p>
                          </div>
                          {isSalesPerformance ? (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Revenue</p>
                              <p className="mt-1 text-base font-bold text-emerald-700">
                                {formatUsd(item.totals.revenueUsd) || "$0.00"}
                              </p>
                            </div>
                          ) : null}
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
              ) : null}

              {activeSection === "activity" ? (
              <div
                id="performance-panel-activity"
                role="tabpanel"
                aria-labelledby="performance-tab-activity"
                className="mt-5"
              >
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
                  <div className="space-y-3 pr-1">
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
              ) : null}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
