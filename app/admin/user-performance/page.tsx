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
} from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

const PERIOD_OPTIONS: Array<{ value: AdminUserPerformancePeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

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

function runnerValue(runner: AdminUserPerformanceRunner) {
  const value =
    runner.total ??
    runner.count ??
    runner.value ??
    runner.kpiCount ??
    runner.kpi_count ??
    runner.metricValue ??
    runner.metric_value ??
    0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

type LeaderboardRow = {
  id: string;
  pipeline: string;
  pipelineLabel: string;
  metricLabel: string;
  accent: string;
  runner: AdminUserPerformanceRunner;
  value: number;
};

function StatBlock({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-b border-zinc-200 bg-white/86 px-5 py-4">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-light tracking-tight text-zinc-950">{value}</p>
      <p className="mt-2 text-xs font-light text-zinc-500">{note}</p>
    </div>
  );
}

export default function AdminUserPerformancePage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AdminUserPerformancePeriod>("daily");
  const [date, setDate] = useState(todayValue);
  const [data, setData] = useState<AdminUserPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
  const activities = data?.activities || [];
  const maxClusterTotal = Math.max(1, ...clusters.map((cluster) => Number(cluster.total || 0)));

  const leaderboard = useMemo<LeaderboardRow[]>(() => {
    return clusters
      .flatMap((cluster) =>
        (cluster.runners || []).map((runner, index) => ({
          id: `${cluster.pipeline}-${runner.userId || runner.id || runner.username || index}`,
          pipeline: cluster.pipeline,
          pipelineLabel: cluster.label,
          metricLabel: cluster.metricLabel,
          accent: pipelineAccent(cluster),
          runner,
          value: runnerValue(runner),
        })),
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [clusters]);

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">{isManagerView ? "Manager Control" : "Admin Control"}</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">User Performance</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            {isManagerView
              ? "Department KPI view with the lead-level activity behind each count."
              : "Super-admin KPI view for sales, delegate, and production pipelines."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
            {PERIOD_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={[
                  "h-9 rounded-full px-4 text-sm font-semibold transition-colors",
                  period === item.value
                    ? "bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)]"
                    : "text-zinc-500 hover:text-zinc-950",
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
            className="h-11 rounded-full border border-blue-500/20 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)] hover:bg-blue-700 disabled:bg-blue-600/55"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-3 lg:grid-cols-4">
        <StatBlock
          label="Total KPI"
          value={formatNumber(summary?.totalKpis)}
          note={`${data?.period || period} window`}
        />
        <StatBlock
          label="Active Users"
          value={formatNumber(summary?.activeUsers)}
          note="Pipeline users counted"
        />
        <StatBlock
          label="Contributors"
          value={formatNumber(summary?.contributors)}
          note="Users with KPI activity"
        />
        <StatBlock
          label="Average Per User"
          value={formatNumber(summary?.averagePerUser)}
          note={`Generated ${formatDateTime(data?.generatedAt)}`}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {loading && !data ? (
          <div className="col-span-full flex min-h-64 items-center justify-center border border-zinc-200 bg-white/86 text-sm font-light text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading user performance...
          </div>
        ) : clusters.length ? (
          clusters.map((cluster) => {
            const accent = pipelineAccent(cluster);
            const clusterProgress = Math.min(100, (Number(cluster.total || 0) / maxClusterTotal) * 100);
            const topRunner = (cluster.runners || [])
              .slice()
              .sort((a, b) => runnerValue(b) - runnerValue(a))[0];
            const topRunnerValue = topRunner ? runnerValue(topRunner) : 0;

            return (
              <motion.section
                key={cluster.pipeline}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-zinc-200 bg-white/90 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400">{cluster.metricLabel}</p>
                    <h2 className="mt-2 text-2xl font-light tracking-tight text-zinc-950">{cluster.label}</h2>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_26px_-20px_rgba(15,23,42,0.8)]"
                    style={{ backgroundColor: accent }}
                  >
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-5xl font-light tracking-tight text-zinc-950">{formatNumber(cluster.total)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${clusterProgress}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-5">
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Active</p>
                    <p className="mt-1 text-xl font-light text-zinc-950">{formatNumber(cluster.activeUsers)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Contributors</p>
                    <p className="mt-1 text-xl font-light text-zinc-950">{formatNumber(cluster.contributors)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">Average</p>
                    <p className="mt-1 text-xl font-light text-zinc-950">{formatNumber(cluster.averagePerUser)}</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <p className="text-xs font-medium text-zinc-400">Top user</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                      {runnerName(topRunner || cluster.topUser)}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-zinc-500">{formatNumber(topRunnerValue)}</span>
                  </div>
                </div>
              </motion.section>
            );
          })
        ) : (
          <div className="col-span-full border border-zinc-200 bg-white/86 p-8 text-center text-sm font-light text-zinc-500">
            No user performance data returned for this window.
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <section className="border border-zinc-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Leaderboard</h2>
              <p className="mt-1 text-sm font-light text-zinc-500">
                {isManagerView ? "Top KPI contributors in your department." : "Top KPI contributors across all pipelines."}
              </p>
            </div>
            <UsersRound className="h-5 w-5 text-zinc-400" />
          </div>

          <div className="mt-4 space-y-3">
            {leaderboard.length ? (
              leaderboard.map((row, index) => {
                const maxValue = Math.max(1, leaderboard[0]?.value || 1);
                const progress = Math.min(100, (row.value / maxValue) * 100);
                return (
                  <div key={row.id} className="grid gap-3 border-b border-zinc-100 pb-3 last:border-b-0">
                    <div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem] sm:items-center">
                      <span className="text-sm font-semibold tabular-nums text-zinc-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{runnerName(row.runner)}</p>
                        <p className="mt-1 text-xs font-light text-zinc-500">
                          {row.pipelineLabel} | {row.metricLabel}
                        </p>
                      </div>
                      <p className="text-right text-lg font-light tabular-nums text-zinc-950">{formatNumber(row.value)}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: row.accent }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm font-light text-zinc-500">
                No contributors for this window.
              </div>
            )}
          </div>
        </section>

        {isManagerView ? (
          <section className="border border-zinc-200 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Activity Details</h2>
                <p className="mt-1 text-sm font-light text-zinc-500">
                  {formatNumber(data?.activityTotal || activities.length)} matching actions in this window.
                </p>
              </div>
              <Activity className="h-5 w-5 text-zinc-400" />
            </div>

            <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {activities.length ? (
                activities.map((activity, index) => {
                  const lead = activity.lead || {};
                  const actor = activity.user || {};
                  const event = activity.event || {};
                  return (
                    <div key={activity.id || `${activity.updatedAt || "activity"}-${index}`} className="border-b border-zinc-100 pb-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-950">
                            {lead.name || lead.email || lead.phone || lead.linkedinUrl || "Lead details unavailable"}
                          </p>
                          <p className="mt-1 truncate text-xs font-light text-zinc-500">
                            {[lead.designation, lead.company, lead.email, lead.phone].filter(Boolean).join(" | ") ||
                              "Contact details unavailable"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                          {activity.workflowStatusLabel || activity.workflowStatus || "Updated"}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs font-light text-zinc-500 sm:grid-cols-2">
                        <span className="truncate">By {actor.name || "Unknown user"}</span>
                        <span className="truncate sm:text-right">{formatDateTime(activity.updatedAt)}</span>
                        <span className="truncate sm:col-span-2">
                          {event.canonicalEventName || event.canonicalEventKey || "No event name"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-sm font-light text-zinc-500">
                  No detailed activity for this window.
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="border border-zinc-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Window</h2>
              <p className="mt-1 text-sm font-light text-zinc-500">Backend KPI period metadata.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3">
              <span className="font-light text-zinc-500">Period</span>
              <span className="font-semibold capitalize text-zinc-950">{data?.period || period}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3">
              <span className="font-light text-zinc-500">Date</span>
              <span className="font-semibold text-zinc-950">{data?.date || date}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3">
              <span className="font-light text-zinc-500">Starts</span>
              <span className="text-right font-semibold text-zinc-950">{formatDateTime(data?.periodStart)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-light text-zinc-500">Ends</span>
              <span className="text-right font-semibold text-zinc-950">{formatDateTime(data?.periodEnd)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
