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
  type AdminUserPerformanceCluster,
  type AdminUserPerformancePeriod,
  type AdminUserPerformanceResponse,
  type AdminUserPerformanceRunner,
} from "@/lib/auth";

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
    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.055] px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_60px_-44px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-light tracking-tight text-zinc-50">{value}</p>
      <p className="mt-2 text-xs font-light text-zinc-500">{note}</p>
    </div>
  );
}

export default function AdminUserPerformancePage() {
  const [period, setPeriod] = useState<AdminUserPerformancePeriod>("daily");
  const [date, setDate] = useState(todayValue);
  const [data, setData] = useState<AdminUserPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAdminUserPerformance({ period, date });
      setData(next);
    } catch (error) {
      toast.error("User performance failed to load", { description: getErrorMessage(error) });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, period]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const clusters = useMemo(() => data?.clusters || [], [data?.clusters]);
  const summary = data?.summary;
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
    <div className="min-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[2rem] border border-white/10 bg-[rgba(5,9,16,0.82)] p-5 font-sans text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_36px_120px_-72px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-400">Admin Control</p>
          <h1 className="mt-1 text-4xl font-light tracking-[-0.045em] text-zinc-50">User Performance</h1>
          <p className="mt-3 max-w-3xl text-sm font-light leading-6 text-zinc-500">
            Super-admin KPI view for sales, delegate, and production pipelines.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-full border border-white/14 bg-white/[0.055] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
            {PERIOD_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={[
                  "h-9 rounded-full px-4 text-sm font-semibold transition-colors",
                  period === item.value
                    ? "border border-blue-400/30 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_12px_24px_-16px_rgba(37,99,235,0.95)]"
                    : "text-zinc-400 hover:text-zinc-100",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="relative flex h-11 items-center rounded-full border border-white/14 bg-white/[0.055] pl-4 pr-3 text-sm text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
            <CalendarDays className="mr-2 h-4 w-4 text-zinc-500" />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-full bg-transparent text-sm font-medium text-zinc-100 outline-none [color-scheme:dark]"
            />
          </label>

          <Button
            type="button"
            onClick={() => void loadPerformance()}
            disabled={loading}
            className="h-11 rounded-full border border-blue-400/30 bg-blue-600 px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-16px_rgba(37,99,235,0.95)] hover:bg-blue-500 disabled:bg-blue-600/55"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-3 lg:grid-cols-4">
        <StatBlock label="Total KPI" value={formatNumber(summary?.totalKpis)} note={`${data?.period || period} window`} />
        <StatBlock label="Active Users" value={formatNumber(summary?.activeUsers)} note="Pipeline users counted" />
        <StatBlock label="Contributors" value={formatNumber(summary?.contributors)} note="Users with KPI activity" />
        <StatBlock label="Average Per User" value={formatNumber(summary?.averagePerUser)} note={`Generated ${formatDateTime(data?.generatedAt)}`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {loading && !data ? (
          <div className="col-span-full flex min-h-64 items-center justify-center rounded-[1.5rem] border border-white/12 bg-white/[0.055] text-sm font-light text-zinc-400 backdrop-blur-2xl">
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
                className="rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_60px_-44px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500">{cluster.metricLabel}</p>
                    <h2 className="mt-2 text-2xl font-light tracking-tight text-zinc-50">{cluster.label}</h2>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_26px_-20px_rgba(15,23,42,0.8)]"
                    style={{ backgroundColor: accent }}
                  >
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-5xl font-light tracking-tight text-zinc-50">{formatNumber(cluster.total)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-[width]" style={{ width: `${clusterProgress}%`, backgroundColor: accent }} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                  <div><p className="text-[11px] font-medium text-zinc-500">Active</p><p className="mt-1 text-xl font-light text-zinc-100">{formatNumber(cluster.activeUsers)}</p></div>
                  <div><p className="text-[11px] font-medium text-zinc-500">Contributors</p><p className="mt-1 text-xl font-light text-zinc-100">{formatNumber(cluster.contributors)}</p></div>
                  <div><p className="text-[11px] font-medium text-zinc-500">Average</p><p className="mt-1 text-xl font-light text-zinc-100">{formatNumber(cluster.averagePerUser)}</p></div>
                </div>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-xs font-medium text-zinc-500">Top user</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-100">{runnerName(topRunner || cluster.topUser)}</p>
                    <span className="shrink-0 text-sm font-semibold text-zinc-400">{formatNumber(topRunnerValue)}</span>
                  </div>
                </div>
              </motion.section>
            );
          })
        ) : (
          <div className="col-span-full rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-8 text-center text-sm font-light text-zinc-400 backdrop-blur-2xl">
            No user performance data returned for this window.
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <section className="rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-50">Leaderboard</h2>
              <p className="mt-1 text-sm font-light text-zinc-500">Top KPI contributors across all pipelines.</p>
            </div>
            <UsersRound className="h-5 w-5 text-zinc-500" />
          </div>

          <div className="mt-4 space-y-3">
            {leaderboard.length ? (
              leaderboard.map((row, index) => {
                const maxValue = Math.max(1, leaderboard[0]?.value || 1);
                const progress = Math.min(100, (row.value / maxValue) * 100);
                return (
                  <div key={row.id} className="grid gap-3 border-b border-white/10 pb-3 last:border-b-0">
                    <div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem] sm:items-center">
                      <span className="text-sm font-semibold tabular-nums text-zinc-500">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{runnerName(row.runner)}</p>
                        <p className="mt-1 text-xs font-light text-zinc-500">{row.pipelineLabel} | {row.metricLabel}</p>
                      </div>
                      <p className="text-right text-lg font-light tabular-nums text-zinc-100">{formatNumber(row.value)}</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: row.accent }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm font-light text-zinc-500">No contributors for this window.</div>
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-50">Window</h2>
              <p className="mt-1 text-sm font-light text-zinc-500">Backend KPI period metadata.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="mt-5 space-y-4 text-sm">
            {[
              ["Period", data?.period || period],
              ["Date", data?.date || date],
              ["Starts", formatDateTime(data?.periodStart)],
              ["Ends", formatDateTime(data?.periodEnd)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0">
                <span className="font-light text-zinc-500">{label}</span>
                <span className="text-right font-semibold capitalize text-zinc-100">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
