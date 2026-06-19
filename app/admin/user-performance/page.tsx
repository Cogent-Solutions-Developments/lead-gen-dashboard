"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  Loader2,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchAdminUserPerformance,
  fetchManagerUserPerformance,
  isManagerRole,
  type AdminUserPerformanceCluster,
  type AdminUserPerformancePeriod,
  type AdminUserPerformanceResponse,
  type AdminUserPerformanceRunner,
  type ManagerUserPerformanceActivity,
} from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

const PERIOD_OPTIONS: Array<{ value: AdminUserPerformancePeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

type ChartView = "pie" | "spider";

type ChartMaxValues = {
  total: number;
  activeUsers: number;
  contributors: number;
  averagePerUser: number;
};

function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return number.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function numberValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function runnerValue(runner: AdminUserPerformanceRunner) {
  return numberValue(
    runner.total ??
      runner.count ??
      runner.value ??
      runner.kpiCount ??
      runner.kpi_count ??
      runner.metricValue ??
      runner.metric_value ??
      0,
  );
}

function runnerName(runner?: AdminUserPerformanceRunner | Record<string, unknown> | null) {
  if (!runner || typeof runner !== "object") return "No user";
  const source = runner as AdminUserPerformanceRunner;
  return (
    source.fullName?.trim() ||
    source.full_name?.trim() ||
    source.name?.trim() ||
    source.username?.trim() ||
    "Unnamed user"
  );
}

function pipelineAccent(cluster: AdminUserPerformanceCluster) {
  return cluster.accent || "#2563eb";
}

function sortedRunners(cluster?: AdminUserPerformanceCluster | null) {
  return [...(cluster?.runners || [])].sort((a, b) => runnerValue(b) - runnerValue(a));
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function polarPoint(center: number, radius: number, index: number, total: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function StatBlock({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function PieKpiChart({ cluster }: { cluster: AdminUserPerformanceCluster }) {
  const accent = pipelineAccent(cluster);
  const activeUsers = numberValue(cluster.activeUsers);
  const contributors = numberValue(cluster.contributors);
  const percent = clampRatio(activeUsers > 0 ? contributors / activeUsers : 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * percent;

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
      <svg viewBox="0 0 128 128" className="h-36 w-36">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={accent}
          strokeLinecap="round"
          strokeWidth="16"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="60" textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold">
          {formatNumber(cluster.total)}
        </text>
        <text x="64" y="79" textAnchor="middle" className="fill-zinc-500 text-[10px] font-semibold">
          KPI
        </text>
      </svg>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-500">Contributors</span>
          <span className="font-semibold text-slate-900">{formatNumber(contributors)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-500">Active users</span>
          <span className="font-semibold text-slate-900">{formatNumber(activeUsers)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-500">Coverage</span>
          <span className="font-semibold text-blue-700">{Math.round(percent * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function SpiderKpiChart({
  cluster,
  maxValues,
}: {
  cluster: AdminUserPerformanceCluster;
  maxValues: ChartMaxValues;
}) {
  const accent = pipelineAccent(cluster);
  const center = 76;
  const radius = 54;
  const metrics = [
    { label: "KPI", ratio: clampRatio(numberValue(cluster.total) / maxValues.total) },
    { label: "Active", ratio: clampRatio(numberValue(cluster.activeUsers) / maxValues.activeUsers) },
    { label: "Contrib", ratio: clampRatio(numberValue(cluster.contributors) / maxValues.contributors) },
    { label: "Avg", ratio: clampRatio(numberValue(cluster.averagePerUser) / maxValues.averagePerUser) },
  ];
  const points = metrics
    .map((metric, index) => {
      const point = polarPoint(center, radius * metric.ratio, index, metrics.length);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const rings = [0.35, 0.68, 1];

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 152 152" className="h-40 w-40">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={metrics
              .map((_, index) => {
                const point = polarPoint(center, radius * ring, index, metrics.length);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        {metrics.map((metric, index) => {
          const end = polarPoint(center, radius, index, metrics.length);
          const label = polarPoint(center, radius + 16, index, metrics.length);
          return (
            <g key={metric.label}>
              <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500 text-[9px] font-semibold">
                {metric.label}
              </text>
            </g>
          );
        })}
        <polygon points={points} fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="2.5" />
        {metrics.map((metric, index) => {
          const point = polarPoint(center, radius * metric.ratio, index, metrics.length);
          return <circle key={metric.label} cx={point.x} cy={point.y} r="3" fill={accent} />;
        })}
      </svg>
    </div>
  );
}

function ActivityList({ activities }: { activities: ManagerUserPerformanceActivity[] }) {
  if (!activities.length) {
    return <div className="py-10 text-center text-sm text-zinc-500">No detailed activity for this department.</div>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const lead = activity.lead || {};
        const actor = activity.user || {};
        const event = activity.event || {};
        return (
          <div key={activity.id || `${activity.updatedAt || "activity"}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {lead.name || lead.email || lead.phone || lead.linkedinUrl || "Lead details unavailable"}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {[lead.designation, lead.company, lead.email, lead.phone].filter(Boolean).join(" | ") ||
                    "Contact details unavailable"}
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-700">
                {activity.workflowStatusLabel || activity.workflowStatus || "Updated"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
              <span className="truncate">By {actor.name || "Unknown user"}</span>
              <span className="truncate sm:text-right">{formatDateTime(activity.updatedAt)}</span>
              <span className="truncate sm:col-span-2">
                {event.canonicalEventName || event.canonicalEventKey || "No event name"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminUserPerformancePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AdminUserPerformancePeriod>("daily");
  const [date, setDate] = useState(todayValue);
  const [data, setData] = useState<AdminUserPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartView>("pie");
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const isManagerView = isManagerRole(user?.role);

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const next = isManagerView
        ? await fetchManagerUserPerformance({ period, date, limit: 300 })
        : await fetchAdminUserPerformance({ period, date });
      setData(next);
    } catch (error) {
      toast.error("User performance failed to load", { description: getErrorMessage(error) });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, isManagerView, period]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const clusters = useMemo(() => data?.clusters || [], [data?.clusters]);
  const summary = data?.summary;
  const activities = useMemo(() => data?.activities || [], [data?.activities]);

  useEffect(() => {
    if (!clusters.length) {
      setSelectedPipeline("");
      return;
    }
    if (!clusters.some((cluster) => cluster.pipeline === selectedPipeline)) {
      setSelectedPipeline(clusters[0]?.pipeline || "");
    }
  }, [clusters, selectedPipeline]);

  const maxValues = useMemo<ChartMaxValues>(
    () => ({
      total: Math.max(1, ...clusters.map((cluster) => numberValue(cluster.total))),
      activeUsers: Math.max(1, ...clusters.map((cluster) => numberValue(cluster.activeUsers))),
      contributors: Math.max(1, ...clusters.map((cluster) => numberValue(cluster.contributors))),
      averagePerUser: Math.max(1, ...clusters.map((cluster) => numberValue(cluster.averagePerUser))),
    }),
    [clusters],
  );

  const selectedCluster = useMemo(
    () => clusters.find((cluster) => cluster.pipeline === selectedPipeline) || clusters[0] || null,
    [clusters, selectedPipeline],
  );

  const selectedRunners = useMemo(() => sortedRunners(selectedCluster), [selectedCluster]);

  const selectedActivities = useMemo(
    () => activities.filter((activity) => !selectedCluster?.pipeline || activity.pipeline === selectedCluster.pipeline),
    [activities, selectedCluster?.pipeline],
  );

  const topRunner = selectedRunners[0];
  const topRunnerValue = topRunner ? runnerValue(topRunner) : 0;

  return (
    <div className="admin-page flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="admin-card p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div>
              <p className="admin-eyebrow">{isManagerView ? "Manager Control" : "Admin Control"}</p>
              <h1 className="admin-title">User Performance</h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
                {PERIOD_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPeriod(item.value)}
                    className={[
                      "h-9 rounded-md px-4 text-sm font-semibold transition-colors",
                      period === item.value ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-zinc-500 hover:bg-blue-50 hover:text-blue-700",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="relative flex h-11 items-center rounded-lg border border-zinc-200 bg-white pl-4 pr-3 text-sm text-zinc-500 shadow-sm">
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
                className="h-11 rounded-lg border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:bg-blue-600/55"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <StatBlock label="Total KPI" value={formatNumber(summary?.totalKpis)} note={`${data?.period || period} window`} />
            <StatBlock label="Active Users" value={formatNumber(summary?.activeUsers)} note="Pipeline users counted" />
            <StatBlock label="Contributors" value={formatNumber(summary?.contributors)} note="Users with KPI activity" />
            <StatBlock label="Average Per User" value={formatNumber(summary?.averagePerUser)} note={`Generated ${formatDateTime(data?.generatedAt)}`} />
          </div>
        </div>
      </motion.div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Pipeline KPI Representation</h2>
          <p className="mt-1 text-sm text-zinc-500">Switch between pie coverage and spider comparison for each department.</p>
        </div>
        <div className="grid w-full grid-cols-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm sm:w-64">
          {[
            { value: "pie" as const, label: "Pie Chart" },
            { value: "spider" as const, label: "Spider Chart" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChartView(item.value)}
              className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                chartView === item.value ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-zinc-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {loading && !data ? (
          <div className="admin-card col-span-full flex min-h-64 items-center justify-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading user performance...
          </div>
        ) : clusters.length ? (
          clusters.map((cluster) => {
            const accent = pipelineAccent(cluster);
            const runners = sortedRunners(cluster);
            const clusterTopRunner = runners[0];
            const clusterTopRunnerValue = clusterTopRunner ? runnerValue(clusterTopRunner) : 0;

            return (
              <motion.section
                key={cluster.pipeline}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="admin-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500">{cluster.metricLabel}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{cluster.label}</h3>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm"
                    style={{ backgroundColor: accent }}
                  >
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
                  {chartView === "pie" ? <PieKpiChart cluster={cluster} /> : <SpiderKpiChart cluster={cluster} maxValues={maxValues} />}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-5">
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Active</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(cluster.activeUsers)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Contributors</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(cluster.contributors)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Average</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(cluster.averagePerUser)}</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <p className="text-xs font-medium text-zinc-400">Top user</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                      {runnerName(clusterTopRunner || cluster.topUser)}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-blue-700">{formatNumber(clusterTopRunnerValue)}</span>
                  </div>
                </div>
              </motion.section>
            );
          })
        ) : (
          <div className="admin-card col-span-full p-8 text-center text-sm text-zinc-500">
            No user performance data returned for this window.
          </div>
        )}
      </div>

      <section className="admin-card mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Department Details</h2>
            <p className="mt-1 text-sm text-zinc-500">Leaderboard, activity, and window metadata by department.</p>
          </div>
          <UsersRound className="h-5 w-5 text-blue-600" />
        </div>

        <div className="grid h-[min(40rem,calc(100dvh-18rem))] min-h-[32rem] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)]">
          {loading && !data ? (
            <div className="flex items-center justify-center text-sm text-zinc-500 lg:col-span-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading details...
            </div>
          ) : clusters.length ? (
            <>
              <aside className="min-h-0 overflow-hidden border-b border-zinc-100 bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r">
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:h-full lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
                  {clusters.map((cluster) => {
                    const selected = selectedCluster?.pipeline === cluster.pipeline;
                    return (
                      <button
                        key={cluster.pipeline}
                        type="button"
                        onClick={() => setSelectedPipeline(cluster.pipeline)}
                        className={`flex min-w-52 items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors lg:min-w-0 ${
                          selected
                            ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-transparent bg-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700"
                        }`}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/70 bg-white text-white"
                          style={{ backgroundColor: pipelineAccent(cluster) }}
                        >
                          <Activity className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{cluster.label}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {formatNumber(cluster.total)} KPI, {formatNumber(cluster.contributors)} contributors
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="flex min-h-0 min-w-0 flex-col">
                <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{selectedCluster?.label || "Department"}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{selectedCluster?.metricLabel || "KPI metric"}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center text-xs lg:w-[32rem]">
                      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                        <p className="font-semibold">{formatNumber(selectedCluster?.total)}</p>
                        <p>KPI</p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-600">
                        <p className="font-semibold">{formatNumber(selectedCluster?.activeUsers)}</p>
                        <p>Active</p>
                      </div>
                      <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                        <p className="font-semibold">{formatNumber(selectedCluster?.contributors)}</p>
                        <p>Contrib</p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-600">
                        <p className="font-semibold">{formatNumber(selectedCluster?.averagePerUser)}</p>
                        <p>Avg</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)]">
                    <div className="rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Top Contributors</h3>
                          <p className="mt-1 text-xs text-zinc-500">Managers and admins can compare the selected department here.</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>

                      <div className="space-y-3">
                        {selectedRunners.length ? (
                          selectedRunners.slice(0, 12).map((runner, index) => {
                            const value = runnerValue(runner);
                            const progress = clampRatio(value / Math.max(1, topRunnerValue)) * 100;
                            return (
                              <div key={`${runner.userId || runner.id || runner.username || index}`} className="border-b border-zinc-100 pb-3 last:border-b-0">
                                <div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem] sm:items-center">
                                  <span className="text-sm font-semibold tabular-nums text-zinc-400">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{runnerName(runner)}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{selectedCluster?.metricLabel || "KPI"}</p>
                                  </div>
                                  <p className="text-right text-lg font-semibold tabular-nums text-slate-900">{formatNumber(value)}</p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${progress}%`, backgroundColor: selectedCluster ? pipelineAccent(selectedCluster) : "#2563eb" }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-10 text-center text-sm text-zinc-500">No contributors for this department.</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {isManagerView ? (
                        <div className="rounded-lg border border-zinc-200 bg-white p-4">
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">Activity Details</h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatNumber(selectedActivities.length)} matching actions in this department.
                            </p>
                          </div>
                          <ActivityList activities={selectedActivities} />
                        </div>
                      ) : null}

                      <div className="rounded-lg border border-zinc-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Window</h3>
                            <p className="mt-1 text-xs text-zinc-500">Backend KPI period metadata.</p>
                          </div>
                          <CalendarDays className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2">
                            <span className="text-zinc-500">Period</span>
                            <span className="font-semibold capitalize text-slate-900">{data?.period || period}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2">
                            <span className="text-zinc-500">Date</span>
                            <span className="font-semibold text-slate-900">{data?.date || date}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2">
                            <span className="text-zinc-500">Starts</span>
                            <span className="text-right font-semibold text-slate-900">{formatDateTime(data?.periodStart)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-zinc-500">Ends</span>
                            <span className="text-right font-semibold text-slate-900">{formatDateTime(data?.periodEnd)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="flex items-center justify-center p-8 text-center text-sm text-zinc-500 lg:col-span-2">
              No department details for this window.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
