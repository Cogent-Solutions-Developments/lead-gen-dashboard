"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchAdminUserPerformance,
  fetchManagerPerformance,
  fetchManagerUserPerformance,
  isManagerRole,
  type AdminUserPerformanceCluster,
  type AdminUserPerformancePeriod,
  type AdminUserPerformanceResponse,
  type AdminUserPerformanceRunner,
  type ManagerPerformanceActivity,
  type ManagerPerformanceResponse,
  type ManagerUserPerformanceActivity,
} from "../admin-api";
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

function formatCompactDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
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

function isDatabaseIdLike(value?: string | null) {
  const text = String(value || "").trim();
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^[0-9a-f]{24,32}$/i.test(text)
  );
}

function displayText(value?: string | null) {
  const text = String(value || "").trim();
  return text && !isDatabaseIdLike(text) ? text : "";
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
    displayText(source.fullName) ||
    displayText(source.full_name) ||
    displayText(source.name) ||
    displayText(source.username) ||
    "Unnamed user"
  );
}

function runnerUserId(runner?: AdminUserPerformanceRunner | null) {
  return String(runner?.userId || runner?.id || "").trim();
}

function runnerUsername(runner?: AdminUserPerformanceRunner | null) {
  return displayText(runner?.username);
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

const TEAM_CONTRIBUTION_COLORS = ["#2563eb", "#14b8a6", "#f97316", "#7c3aed", "#0284c7", "#16a34a"];

type TeamContributionSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  ratio: number;
};

function piePoint(center: number, radius: number, ratio: number) {
  const angle = -Math.PI / 2 + Math.PI * 2 * ratio;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function donutSlicePath(center: number, outerRadius: number, innerRadius: number, startRatio: number, endRatio: number) {
  const start = clampRatio(startRatio);
  const end = clampRatio(endRatio);
  const largeArc = end - start > 0.5 ? 1 : 0;
  const outerStart = piePoint(center, outerRadius, start);
  const outerEnd = piePoint(center, outerRadius, end);
  const innerEnd = piePoint(center, innerRadius, end);
  const innerStart = piePoint(center, innerRadius, start);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function buildTeamContributionSegments(cluster: AdminUserPerformanceCluster) {
  const activeRunners = sortedRunners(cluster).filter((runner) => runnerValue(runner) > 0);
  const visibleRunners = activeRunners.slice(0, 5);
  const remainingValue = activeRunners.slice(5).reduce((total, runner) => total + runnerValue(runner), 0);
  const rawSegments = visibleRunners.map((runner, index) => ({
    key: String(runner.userId || runner.id || runner.username || `${cluster.pipeline}-${index}`),
    label: runnerName(runner),
    value: runnerValue(runner),
  }));

  if (remainingValue > 0) {
    rawSegments.push({
      key: `${cluster.pipeline}-other-contributors`,
      label: "Other contributors",
      value: remainingValue,
    });
  }

  const total = rawSegments.reduce((sum, segment) => sum + segment.value, 0);
  return rawSegments.map<TeamContributionSegment>((segment, index) => ({
    ...segment,
    color: index === 0 ? pipelineAccent(cluster) : TEAM_CONTRIBUTION_COLORS[index % TEAM_CONTRIBUTION_COLORS.length],
    ratio: total > 0 ? segment.value / total : 0,
  }));
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
  const center = 64;
  const outerRadius = 48;
  const innerRadius = 31;
  const segments = buildTeamContributionSegments(cluster);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const slices = segments.map((segment, index) => {
    const start = segments.slice(0, index).reduce((sum, current) => sum + current.ratio, 0);
    const end = start + segment.ratio;
    return { ...segment, start, end };
  });

  return (
    <div className="grid gap-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center">
      <svg viewBox="0 0 128 128" className="h-[9.5rem] w-[9.5rem] shrink-0" role="img" aria-label={`${cluster.label} team KPI contribution`}>
        <circle cx={center} cy={center} r={(outerRadius + innerRadius) / 2} fill="none" stroke="#e5e7eb" strokeWidth={outerRadius - innerRadius} />
        {slices.map((segment) =>
          segment.ratio >= 0.999 ? (
            <circle
              key={segment.key}
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke={segment.color}
              strokeWidth={outerRadius - innerRadius}
            />
          ) : (
            <path
              key={segment.key}
              d={donutSlicePath(center, outerRadius, innerRadius, segment.start, segment.end)}
              fill={segment.color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ),
        )}
        <circle cx={center} cy={center} r={innerRadius - 1} fill="#ffffff" />
        <text x={center} y="59" textAnchor="middle" fill="#0f172a" fontSize="21" fontWeight="700">
          {formatNumber(total)}
        </text>
        <text x={center} y="78" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">
          Team KPI
        </text>
      </svg>

      <div className="min-w-0 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Team contribution</p>
          <p className="mt-1 text-xs text-zinc-500">{cluster.metricLabel} split by contributor.</p>
        </div>
        {slices.length ? (
          <div className="space-y-2.5">
            {slices.map((segment) => (
              <div key={segment.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate text-zinc-600" title={segment.label}>
                    {segment.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">{formatNumber(segment.value)}</span>
                  <span className="ml-2 text-xs font-semibold text-blue-700">{Math.round(segment.ratio * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-4 text-sm text-zinc-500">
            No team contribution yet.
          </div>
        )}
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
  const center = 64;
  const radius = 47;
  const metrics = [
    {
      label: "Total KPI",
      value: numberValue(cluster.total),
      ratio: clampRatio(numberValue(cluster.total) / maxValues.total),
    },
    {
      label: "Active users",
      value: numberValue(cluster.activeUsers),
      ratio: clampRatio(numberValue(cluster.activeUsers) / maxValues.activeUsers),
    },
    {
      label: "Contributors",
      value: numberValue(cluster.contributors),
      ratio: clampRatio(numberValue(cluster.contributors) / maxValues.contributors),
    },
    {
      label: "Average per user",
      value: numberValue(cluster.averagePerUser),
      ratio: clampRatio(numberValue(cluster.averagePerUser) / maxValues.averagePerUser),
    },
  ];
  const points = metrics
    .map((metric, index) => {
      const point = polarPoint(center, radius * metric.ratio, index, metrics.length);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const rings = [0.35, 0.68, 1];

  return (
    <div className="grid gap-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center">
      <svg viewBox="0 0 128 128" className="h-[9.5rem] w-[9.5rem] shrink-0" role="img" aria-label={`${cluster.label} KPI shape`}>
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
          return (
            <g key={metric.label}>
              <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#e5e7eb" strokeWidth="1" />
            </g>
          );
        })}
        <polygon points={points} fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="2.5" />
        {metrics.map((metric, index) => {
          const point = polarPoint(center, radius * metric.ratio, index, metrics.length);
          return <circle key={metric.label} cx={point.x} cy={point.y} r="3" fill={accent} />;
        })}
      </svg>

      <div className="min-w-0 space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">Department shape</p>
          <p className="mt-1 text-xs text-zinc-500">Each axis is scaled against the strongest department.</p>
        </div>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-zinc-600" title={metric.label}>
                  {metric.label}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatNumber(metric.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full rounded-full" style={{ width: `${Math.round(metric.ratio * 100)}%`, backgroundColor: accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
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
                {displayText(event.canonicalEventName) || "No event name"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function kpiActivityTitle(activity: ManagerPerformanceActivity) {
  const lead = activity.leadSnapshot || {};
  return (
    displayText(lead.employeeName) ||
    displayText(lead.email) ||
    displayText(lead.phone) ||
    displayText(lead.linkedinUrl) ||
    "Lead details unavailable"
  );
}

function kpiActivityMeta(activity: ManagerPerformanceActivity) {
  const lead = activity.leadSnapshot || {};
  return [lead.title, lead.company, lead.email, lead.phone].filter(Boolean).join(" | ");
}

function UserKpiDetailDialog({
  runner,
  cluster,
  data,
  loading,
  error,
  onClose,
}: {
  runner: AdminUserPerformanceRunner;
  cluster: AdminUserPerformanceCluster;
  data: ManagerPerformanceResponse | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const activities = data?.activities || [];
  const totalRecords = numberValue(data?.pagination?.activityTotal || activities.length);
  const metricTotal = runnerValue(runner);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
      <button type="button" aria-label="Close KPI details" className="absolute inset-0 cursor-default" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-kpi-detail-title"
      >
        <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-blue-700">{cluster.label} KPI Records</p>
              <h2 id="user-kpi-detail-title" className="mt-1 truncate text-xl font-semibold text-slate-900">
                {runnerName(runner)}
              </h2>
              <p className="mt-1 truncate text-sm text-zinc-500">
                {[runnerUsername(runner), cluster.metricLabel].filter(Boolean).join(" | ")}
              </p>
            </div>
            <Button type="button" variant="outline" size="icon-sm" className="shrink-0 rounded-lg" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-blue-700">User KPI</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(metricTotal)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Records</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{loading ? "-" : formatNumber(totalRecords)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Period</p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{data?.period?.key || "-"}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-500">Window</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(data?.period?.start)}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading user KPI details...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-6 text-sm text-red-700">{error}</div>
          ) : activities.length ? (
            <div className="space-y-3 border-l border-blue-100 pl-5">
              {activities.map((activity, index) => {
                const meta = kpiActivityMeta(activity);
                return (
                  <div key={activity.id || `${activity.userId}-${activity.createdAt}-${index}`} className="relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <span className="absolute -left-[1.68rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-blue-700">Record {String(index + 1).padStart(2, "0")}</p>
                        <h3 className="mt-1 truncate text-sm font-semibold text-slate-900" title={kpiActivityTitle(activity)}>
                          {kpiActivityTitle(activity)}
                        </h3>
                        <p className="mt-1 truncate text-xs text-zinc-500" title={meta || undefined}>
                          {meta || "Contact details unavailable"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        <Clock3 className="h-3.5 w-3.5 text-blue-600" />
                        {formatDateTime(activity.createdAt)}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                      <div className="rounded-md bg-zinc-50 px-3 py-2">
                        <p className="font-semibold uppercase text-zinc-400">Status</p>
                        <p className="mt-1 font-semibold text-slate-800">{activity.workflowStatusLabel || activity.workflowStatus || cluster.metricLabel}</p>
                      </div>
                      <div className="rounded-md bg-zinc-50 px-3 py-2">
                        <p className="font-semibold uppercase text-zinc-400">Event</p>
                        <p className="mt-1 truncate font-semibold text-slate-800" title={displayText(activity.canonicalEventName) || undefined}>
                          {displayText(activity.canonicalEventName) || "-"}
                        </p>
                      </div>
                      <div className="rounded-md bg-zinc-50 px-3 py-2">
                        <p className="font-semibold uppercase text-zinc-400">Type</p>
                        <p className="mt-1 font-semibold capitalize text-slate-800">{activity.type || "workflow-status"}</p>
                      </div>
                    </div>
                    {activity.comment ? <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">{activity.comment}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
              No KPI records returned for this user in the selected window.
            </div>
          )}
        </div>
      </motion.div>
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
  const [detailRunner, setDetailRunner] = useState<AdminUserPerformanceRunner | null>(null);
  const [detailCluster, setDetailCluster] = useState<AdminUserPerformanceCluster | null>(null);
  const [detailData, setDetailData] = useState<ManagerPerformanceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
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

  const openRunnerDetails = useCallback(
    async (runner: AdminUserPerformanceRunner, cluster: AdminUserPerformanceCluster) => {
      const userId = runnerUserId(runner);
      if (!userId) {
        toast.error("User details unavailable", { description: "This contributor does not include a user id." });
        return;
      }

      setDetailRunner(runner);
      setDetailCluster(cluster);
      setDetailData(null);
      setDetailError("");
      setDetailLoading(true);

      try {
        const next = await fetchManagerPerformance({
          period,
          date,
          userId,
          workflowStatus: cluster.metricKey || undefined,
          limit: 300,
        });
        setDetailData(next);
      } catch (error) {
        const message = getErrorMessage(error);
        setDetailError(message);
        toast.error("KPI details failed to load", { description: message });
      } finally {
        setDetailLoading(false);
      }
    },
    [date, period],
  );

  const closeRunnerDetails = useCallback(() => {
    setDetailRunner(null);
    setDetailCluster(null);
    setDetailData(null);
    setDetailError("");
    setDetailLoading(false);
  }, []);

  const topRunner = selectedRunners[0];
  const topRunnerValue = topRunner ? runnerValue(topRunner) : 0;
  const windowDetails = [
    {
      label: "Period",
      value: data?.period || period,
      note: "Selected KPI grouping",
      capitalize: true,
    },
    {
      label: "Date",
      value: data?.date || date,
      note: "Requested report date",
    },
    {
      label: "Starts",
      value: formatCompactDateTime(data?.periodStart),
      note: "Window opening time",
    },
    {
      label: "Ends",
      value: formatCompactDateTime(data?.periodEnd),
      note: "Window closing time",
    },
  ];

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

        <div className="grid overflow-hidden lg:max-h-[42rem] lg:grid-cols-[16rem_minmax(0,1fr)]">
          {loading && !data ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500 lg:col-span-2">
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
                <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
                  <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <div className="flex items-center gap-2 font-semibold uppercase text-blue-700">
                          <CalendarDays className="h-4 w-4" />
                          <span>Window overview</span>
                        </div>
                        {windowDetails.map((item) => (
                          <div
                            key={item.label}
                            className="inline-flex max-w-full items-baseline gap-1.5"
                            title={`${item.note}: ${item.value}`}
                          >
                            <span className="shrink-0 text-[10px] font-semibold uppercase leading-4 text-zinc-400">{item.label}</span>
                            <span className={`truncate font-semibold text-slate-900 ${item.capitalize ? "capitalize" : ""}`}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{selectedCluster?.label || "Department"}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {selectedCluster?.metricLabel || "KPI metric"} performance inside the selected {data?.period || period} KPI window.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4 2xl:w-[30rem]">
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
                  <div className={isManagerView ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)]" : "grid gap-4"}>
                    <div className="flex min-h-0 max-h-[28rem] flex-col rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Top Contributors</h3>
                          <p className="mt-1 text-xs text-zinc-500">Managers and admins can compare the selected department here.</p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="space-y-3 pb-1">
                        {selectedRunners.length ? (
                          selectedRunners.map((runner, index) => {
                            const value = runnerValue(runner);
                            const progress = clampRatio(value / Math.max(1, topRunnerValue)) * 100;
                            const canOpenDetails = Boolean(selectedCluster && runnerUserId(runner));
                            return (
                              <div key={`${runner.userId || runner.id || runner.username || index}`} className="border-b border-zinc-100 pb-3 last:border-b-0">
                                <div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_5rem] sm:items-center">
                                  <span className="text-sm font-semibold tabular-nums text-zinc-400">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{runnerName(runner)}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{selectedCluster?.metricLabel || "KPI"}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!canOpenDetails || detailLoading}
                                    onClick={() => {
                                      if (selectedCluster) void openRunnerDetails(runner, selectedCluster);
                                    }}
                                    className="h-8 rounded-md border-blue-100 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Details
                                  </Button>
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
                    </div>

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

      {detailRunner && detailCluster ? (
        <UserKpiDetailDialog
          runner={detailRunner}
          cluster={detailCluster}
          data={detailData}
          loading={detailLoading}
          error={detailError}
          onClose={closeRunnerDetails}
        />
      ) : null}
    </div>
  );
}
