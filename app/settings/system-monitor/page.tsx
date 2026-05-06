"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Database,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSystemMonitorSnapshot,
  type SystemMonitorSnapshot,
  type SystemMonitorStatus,
} from "@/lib/auth";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatAge(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return "-";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function formatBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatContext(context?: Record<string, unknown>) {
  if (!context || Object.keys(context).length === 0) return "-";
  try {
    return JSON.stringify(context);
  } catch {
    return String(context);
  }
}

function countValue(value?: number | null) {
  return Number(value || 0).toLocaleString();
}

function statusTone(status?: SystemMonitorStatus | null) {
  const value = String(status || "").toLowerCase();
  if (value === "ok" || value === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "warning" || value === "info") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (value === "critical" || value === "failed" || value === "failure" || value === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusBadge({ value }: { value?: SystemMonitorStatus | null }) {
  return (
    <Badge className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-none ${statusTone(value)}`}>
      {String(value || "unknown")}
    </Badge>
  );
}

function SeverityBadge({ value }: { value?: string | null }) {
  return <StatusBadge value={value || "info"} />;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/84 py-0">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-zinc-500">
        {label}
      </td>
    </tr>
  );
}

function MetricCard({
  label,
  value,
  detail,
  status,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  status?: SystemMonitorStatus | null;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/88 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
            {status ? <StatusBadge value={status} /> : null}
          </div>
          {detail ? <p className="mt-2 truncate text-xs text-zinc-500">{detail}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function SystemMonitorPage() {
  const { isSuperAdmin } = useAuth();
  const [snapshot, setSnapshot] = useState<SystemMonitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!isSuperAdmin) return;

      if (!silent) setLoading(true);
      setRefreshing(true);
      setError(null);
      try {
        const data = await fetchSystemMonitorSnapshot();
        setSnapshot(data);
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error("System monitor load failed", { description: message });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSuperAdmin]
  );

  useEffect(() => {
    if (isSuperAdmin) void loadSnapshot();
  }, [isSuperAdmin, loadSnapshot]);

  useEffect(() => {
    if (!autoRefresh || !isSuperAdmin) return;
    const timer = window.setInterval(() => {
      void loadSnapshot({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, isSuperAdmin, loadSnapshot]);

  const checks = snapshot?.checks;
  const runtime = snapshot?.runtime;
  const warnings = snapshot?.warnings ?? [];
  const pipelineRows = runtime?.pipelines?.byPipelineStatus ?? [];
  const jobRows = runtime?.jobs?.byState ?? [];
  const staleRows = runtime?.progress?.staleRows ?? [];
  const queueRows = runtime?.sendQueue?.byChannelStatus ?? [];
  const stuckRows = runtime?.sendQueue?.stuckByChannel ?? [];
  const providerRows = runtime?.providers?.recentFailures ?? [];
  const providerExamples = runtime?.providers?.examples ?? [];
  const logFiles = runtime?.logs?.files ?? [];
  const missingServices = runtime?.logs?.missingServices ?? [];

  const overviewCards = useMemo(
    () => [
      {
        label: "Overall Status",
        value: snapshot?.status || "unknown",
        status: snapshot?.status,
        detail: snapshot?.generatedAt ? `Generated ${formatDateTime(snapshot.generatedAt)}` : "No snapshot yet",
        icon: Activity,
      },
      {
        label: "Database",
        value: checks?.database?.status || "unknown",
        status: checks?.database?.status,
        detail: checks?.database?.checkedAt ? `Checked ${formatDateTime(checks.database.checkedAt)}` : checks?.database?.error,
        icon: Database,
      },
      {
        label: "Redis",
        value: checks?.redis?.status || "unknown",
        status: checks?.redis?.status,
        detail: checks?.redis?.checkedAt ? `Checked ${formatDateTime(checks.redis.checkedAt)}` : checks?.redis?.error,
        icon: Zap,
      },
      {
        label: "Celery",
        value: checks?.celery?.workerCount ?? 0,
        status: checks?.celery?.status,
        detail: `${checks?.celery?.queuesSeen?.length ?? 0} queues seen, ${checks?.celery?.missingQueues?.length ?? 0} missing`,
        icon: Workflow,
      },
      {
        label: "Warnings",
        value: warnings.length,
        status: warnings.length > 0 ? "warning" : "ok",
        detail: snapshot?.actor ? `Actor ${snapshot.actor}` : `${snapshot?.environment || "-"} / ${snapshot?.service || "-"}`,
        icon: AlertTriangle,
      },
    ],
    [checks, snapshot, warnings.length]
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
        <Card className="max-w-md rounded-2xl border border-zinc-200 bg-white/88 p-6 text-center">
          <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">Super Admin Only</h1>
          <p className="mt-2 text-sm text-zinc-500">System Monitor is restricted to super admin users.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-sans flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Settings</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">System Monitor</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Read-only operational health for LeadGen services, queues, providers, jobs, and logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Auto 30s
          </label>

          <Link href="/settings">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-zinc-200 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>

          <Button
            type="button"
            onClick={() => void loadSnapshot()}
            disabled={refreshing}
            className="analytics-frost-btn h-10 px-4"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !snapshot ? (
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-200 bg-white/84 p-8">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading system monitor...
          </div>
        </Card>
      ) : null}

      {!loading && !snapshot && !error ? (
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-200 bg-white/84 p-8 text-sm text-zinc-500">
          No system monitor snapshot is available.
        </Card>
      ) : null}

      {snapshot ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map((item) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                status={item.status}
                detail={item.detail}
                icon={item.icon}
              />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard
              title="Pipeline Health"
              description={`Active campaigns: ${countValue(runtime?.pipelines?.activeTotal)}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-5 py-3">Pipeline</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pipelineRows.length === 0 ? (
                      <EmptyRow colSpan={3} label="No pipeline rows found." />
                    ) : (
                      pipelineRows.map((row, index) => (
                        <tr key={`${row.pipeline}-${row.status}-${index}`} className="hover:bg-zinc-50/80">
                          <td className="px-5 py-3 text-sm font-semibold text-zinc-900">{row.pipeline}</td>
                          <td className="px-5 py-3"><StatusBadge value={row.status} /></td>
                          <td className="px-5 py-3 text-right text-sm text-zinc-700">{countValue(row.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Jobs"
              description={`Active: ${countValue(runtime?.jobs?.activeTotal)} / Failed recent: ${countValue(runtime?.jobs?.failedRecent)}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-5 py-3">State</th>
                      <th className="px-5 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {jobRows.length === 0 ? (
                      <EmptyRow colSpan={2} label="No job state rows found." />
                    ) : (
                      jobRows.map((row, index) => (
                        <tr key={`${row.state}-${index}`} className="hover:bg-zinc-50/80">
                          <td className="px-5 py-3"><StatusBadge value={row.state} /></td>
                          <td className="px-5 py-3 text-right text-sm text-zinc-700">{countValue(row.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Profile And Progress Health">
            <div className="grid gap-3 border-b border-zinc-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Running Progress" value={countValue(runtime?.progress?.runningTotal)} icon={Clock3} />
              <MetricCard label="Stale Running" value={countValue(runtime?.progress?.staleRunningTotal)} status={(runtime?.progress?.staleRunningTotal || 0) > 0 ? "warning" : "ok"} icon={AlertTriangle} />
              <MetricCard label="Batch In Progress" value={countValue(runtime?.progress?.batchInProgressTotal)} icon={Layers3} />
              <MetricCard label="Content In Progress" value={countValue(runtime?.progress?.contentInProgressTotal)} icon={Workflow} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {staleRows.length === 0 ? (
                    <EmptyRow colSpan={4} label="No stale running progress rows." />
                  ) : (
                    staleRows.map((row) => (
                      <tr key={`${row.campaignId}-${row.updatedAt}`} className="hover:bg-zinc-50/80">
                        <td className="px-5 py-3 font-mono text-xs text-zinc-700">{row.campaignId}</td>
                        <td className="px-5 py-3 text-sm text-zinc-700">{row.eventCode || "-"}</td>
                        <td className="px-5 py-3 text-sm text-zinc-700">{countValue(row.doneTotal)} / {countValue(row.targetTotal)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-500">{formatDateTime(row.updatedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Send Queue Health"
            description={`Open: ${countValue(runtime?.sendQueue?.openTotal)} / Failed: ${countValue(runtime?.sendQueue?.failedTotal)} / Stuck: ${countValue(runtime?.sendQueue?.stuckTotal)}`}
          >
            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {queueRows.length === 0 ? (
                      <EmptyRow colSpan={3} label="No send queue rows found." />
                    ) : (
                      queueRows.map((row, index) => (
                        <tr key={`${row.channel}-${row.status}-${index}`} className="hover:bg-zinc-50/80">
                          <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{row.channel}</td>
                          <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-700">{countValue(row.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Oldest Open Row</p>
                  {runtime?.sendQueue?.oldestOpen ? (
                    <div className="mt-3 space-y-2 text-xs text-zinc-600">
                      <p className="break-all font-mono text-zinc-800">{runtime.sendQueue.oldestOpen.id}</p>
                      <p>{runtime.sendQueue.oldestOpen.channel || "-"} / {runtime.sendQueue.oldestOpen.status || "-"}</p>
                      <p>Due: {formatDateTime(runtime.sendQueue.oldestOpen.dueAt)}</p>
                      <p>Attempts: {countValue(runtime.sendQueue.oldestOpen.attempts)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">No open queue row.</p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Stuck By Channel</p>
                  {stuckRows.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">No stuck channel rows.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {stuckRows.map((row) => (
                        <div key={row.channel} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-700">{row.channel}</span>
                          <span className="text-zinc-500">{countValue(row.count)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Provider Failures"
            description={`Failed last 24h: ${countValue(runtime?.providers?.failedLast24h)}`}
          >
            <div className="grid gap-5 p-5 xl:grid-cols-2">
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[480px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {providerRows.length === 0 ? (
                      <EmptyRow colSpan={3} label="No recent provider failures." />
                    ) : (
                      providerRows.map((row, index) => (
                        <tr key={`${row.provider}-${row.channel}-${index}`} className="hover:bg-zinc-50/80">
                          <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{row.provider}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.channel}</td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-700">{countValue(row.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[620px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Queue</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Error</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {providerExamples.length === 0 ? (
                      <EmptyRow colSpan={4} label="No provider failure examples." />
                    ) : (
                      providerExamples.map((row) => (
                        <tr key={`${row.queueId}-${row.updatedAt}`} className="hover:bg-zinc-50/80">
                          <td className="px-4 py-3 font-mono text-xs text-zinc-700">{row.queueId}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.provider || "-"} / {row.channel || "-"}</td>
                          <td className="max-w-[18rem] truncate px-4 py-3 text-xs text-zinc-600" title={row.error || ""}>{row.error || "-"}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(row.updatedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Logs"
            description={`Root: ${runtime?.logs?.logRoot || "-"} / Missing services: ${missingServices.length}`}
          >
            {missingServices.length > 0 ? (
              <div className="border-b border-zinc-100 px-5 py-3 text-sm text-amber-700">
                Missing: {missingServices.join(", ")}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3">Path</th>
                    <th className="px-5 py-3">Size</th>
                    <th className="px-5 py-3">Age</th>
                    <th className="px-5 py-3">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {logFiles.length === 0 ? (
                    <EmptyRow colSpan={5} label="No service log files found." />
                  ) : (
                    logFiles.map((row) => (
                      <tr key={row.service} className="hover:bg-zinc-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-zinc-900">{row.service}</td>
                        <td className="max-w-[28rem] truncate px-5 py-3 font-mono text-xs text-zinc-600" title={row.path}>{row.path}</td>
                        <td className="px-5 py-3 text-sm text-zinc-700">{formatBytes(row.sizeBytes)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-700">{formatAge(row.ageSeconds)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-500">{formatDateTime(row.modifiedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Warnings" description={`${warnings.length} current warning rows`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {warnings.length === 0 ? (
                    <EmptyRow colSpan={4} label="No warnings." />
                  ) : (
                    warnings.map((row, index) => (
                      <tr key={`${row.code}-${index}`} className="hover:bg-zinc-50/80">
                        <td className="px-5 py-3"><SeverityBadge value={row.severity} /></td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-700">{row.code}</td>
                        <td className="px-5 py-3 text-sm text-zinc-700">{row.message}</td>
                        <td className="max-w-[24rem] truncate px-5 py-3 font-mono text-xs text-zinc-500" title={formatContext(row.context)}>
                          {formatContext(row.context)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
