"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Layers3,
  Loader2,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  TrendingUp,
  Workflow,
  Zap,
  type LucideIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSystemOperationRecoveryGuide,
  fetchSystemMonitorSnapshot,
  listSystemOperationIncidents,
  listSystemOperationLogServices,
  type SystemOperationIncident,
  type SystemOperationLogService,
  type SystemOperationRecoveryGuideItem,
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

function humanizeStatusLabel(value?: string | null) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "Unknown";
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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
  return "border-zinc-300 bg-zinc-50 text-zinc-600";
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
    <Card className="overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/84 py-0">
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
    <div className="rounded-2xl border border-zinc-300 bg-white/88 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
            {status ? <StatusBadge value={status} /> : null}
          </div>
          {detail ? <p className="mt-2 truncate text-xs text-zinc-500">{detail}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ExternalDashboardButton({ label, href }: { label: string; href?: string | null }) {
  if (!href) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className="h-10 border-zinc-300 bg-white/70 px-4 text-zinc-400"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      className="h-10 border-zinc-300 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
    >
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink className="mr-2 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

function isGoodStatus(status?: SystemMonitorStatus | null) {
  const value = String(status || "").toLowerCase();
  return value === "ok" || value === "success";
}

function isProblemStatus(status?: SystemMonitorStatus | null) {
  const value = String(status || "").toLowerCase();
  return value === "critical" || value === "failed" || value === "failure" || value === "error";
}

function executiveStatusLabel(status?: SystemMonitorStatus | null) {
  if (isGoodStatus(status)) return "Healthy";
  if (isProblemStatus(status)) return "Needs action";
  const value = String(status || "").toLowerCase();
  if (value === "warning" || value === "info") return "Watch";
  return "Unknown";
}

function executiveStatusColor(status?: SystemMonitorStatus | null) {
  if (isGoodStatus(status)) return "#10b981";
  if (isProblemStatus(status)) return "#ef4444";
  return "#f59e0b";
}

function normalizePipelineName(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "delegates") return "delegate";
  if (normalized === "delegate") return "delegate";
  if (normalized === "production") return "production";
  return "sales";
}

function chartNumber(value?: number | null) {
  return Number(value || 0);
}

function CeoSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-[1.35rem] border border-zinc-200/90 bg-white py-0 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.7)]">
      <div className="flex flex-col gap-1 border-b border-zinc-100 px-6 py-5">
        <h2 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h2>
        {description ? <p className="text-sm text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

const ceoMetricTone = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
} as const;

function CeoMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof ceoMetricTone;
}) {
  return (
    <div className="h-full min-h-36 rounded-[1.25rem] border border-zinc-200/90 bg-white p-5 shadow-[0_16px_46px_-40px_rgba(15,23,42,0.72)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
          <p className="mt-2 text-sm leading-5 text-zinc-500">{detail}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${ceoMetricTone[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function HealthGauge({ score, status }: { score: number; status?: SystemMonitorStatus | null }) {
  const color = executiveStatusColor(status);
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div
        className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${Math.max(0, Math.min(100, score)) * 3.6}deg, #e5e7eb 0deg)` }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-inner">
          <div className="text-center">
            <p className="text-4xl font-semibold tracking-tight text-zinc-950">{score}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Score</p>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Overall readiness</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{executiveStatusLabel(status)}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Business health score from platform availability and current attention pressure.
        </p>
      </div>
    </div>
  );
}

function ScoreBreakdown({
  serviceScore,
  stabilityScore,
  readyServices,
  totalServices,
  attentionPressure,
}: {
  serviceScore: number;
  stabilityScore: number;
  readyServices: number;
  totalServices: number;
  attentionPressure: number;
}) {
  const rows = [
    {
      label: "Core platform",
      value: serviceScore,
      max: 70,
      detail: `${readyServices} of ${totalServices} health checks ready`,
      color: "#2563eb",
    },
    {
      label: "Operational stability",
      value: stabilityScore,
      max: 30,
      detail: `${attentionPressure} attention signals`,
      color: stabilityScore >= 20 ? "#10b981" : stabilityScore > 0 ? "#f59e0b" : "#ef4444",
    },
  ];

  return (
    <div className="rounded-[1.15rem] border border-zinc-200 bg-zinc-50/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Score breakdown</p>
        <p className="text-xs font-semibold text-zinc-400">Max 100</p>
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-800">{row.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{row.detail}</p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-zinc-950">
                {row.value}/{row.max}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, (row.value / row.max) * 100))}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-zinc-500">
        Total score is core platform plus operational stability. Stability loses 3 points per attention signal, capped at 30.
      </p>
    </div>
  );
}

function ServiceTile({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status?: SystemMonitorStatus | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">{label}</p>
        <p className="mt-0.5 text-xs leading-4 text-zinc-500">{detail}</p>
      </div>
      <span
        className="flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold"
        style={{
          borderColor: `${executiveStatusColor(status)}55`,
          backgroundColor: `${executiveStatusColor(status)}12`,
          color: executiveStatusColor(status),
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: executiveStatusColor(status) }} />
        {executiveStatusLabel(status)}
      </span>
    </div>
  );
}

function EmptyInsight({ label }: { label: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-sm text-zinc-500">
      {label}
    </div>
  );
}

function CeoReportGroup({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 border-l-2 border-zinc-300 pl-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">{eyebrow}</p>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CeoSystemMonitorView({
  snapshot,
  loading,
  error,
  refreshing,
  onRefresh,
}: {
  snapshot: SystemMonitorSnapshot | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const checks = snapshot?.checks;
  const runtime = snapshot?.runtime;
  const warnings = snapshot?.warnings ?? [];
  const pipelineRows = runtime?.pipelines?.byPipelineStatus ?? [];
  const serviceChecks = [
    {
      label: "Lead data",
      detail: "Event and lead records",
      status: checks?.database?.status,
    },
    {
      label: "Live coordination",
      detail: "Real-time handoff between screens and workers",
      status: checks?.redis?.status,
    },
    {
      label: "Automation workers",
      detail: `${countValue(checks?.celery?.workerCount)} workers available`,
      status: checks?.celery?.status,
    },
  ];
  const readyServices = serviceChecks.filter((item) => isGoodStatus(item.status)).length;
  const staleProgress = chartNumber(runtime?.progress?.staleRunningTotal);
  const failedJobs = chartNumber(runtime?.jobs?.failedRecent);
  const failedMessages = chartNumber(runtime?.sendQueue?.failedTotal);
  const stuckMessages = chartNumber(runtime?.sendQueue?.stuckTotal);
  const providerFailures = chartNumber(runtime?.providers?.failedLast24h);
  const serviceMaxScore = 70;
  const stabilityMaxScore = 30;
  const attentionPressure = warnings.length + staleProgress + failedJobs + failedMessages + stuckMessages + providerFailures;
  const serviceScore = Math.round((readyServices / Math.max(1, serviceChecks.length)) * serviceMaxScore);
  const stabilityDeduction = Math.min(stabilityMaxScore, attentionPressure * 3);
  const stabilityScore = Math.max(0, stabilityMaxScore - stabilityDeduction);
  const readinessScore = Math.max(0, Math.min(100, serviceScore + stabilityScore));
  const departmentMap = new Map<string, number>();
  pipelineRows.forEach((row) => {
    const key = normalizePipelineName(row.pipeline);
    departmentMap.set(key, chartNumber(departmentMap.get(key)) + chartNumber(row.count));
  });
  const departmentRows = [
    { key: "sales", label: "Sales", count: departmentMap.get("sales") || 0, fill: "#1d4ed8" },
    { key: "delegate", label: "Delegate", count: departmentMap.get("delegate") || 0, fill: "#0f766e" },
    { key: "production", label: "Production", count: departmentMap.get("production") || 0, fill: "#6d28d9" },
  ];
  const hasDepartmentData = departmentRows.some((row) => row.count > 0);
  const statusMap = new Map<string, number>();
  pipelineRows.forEach((row) => {
    const label = humanizeStatusLabel(row.status);
    statusMap.set(label, chartNumber(statusMap.get(label)) + chartNumber(row.count));
  });
  const statusRows = Array.from(statusMap, ([label, count], index) => ({
    label,
    count,
    fill: ["#059669", "#1d4ed8", "#d97706", "#dc2626", "#6d28d9"][index % 5],
  }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
  const queueData = [
    { name: "Waiting", value: chartNumber(runtime?.sendQueue?.openTotal), fill: "#0f766e" },
    { name: "Failed", value: failedMessages, fill: "#dc2626" },
    { name: "Stuck", value: stuckMessages, fill: "#d97706" },
  ].filter((item) => item.value > 0);
  const attentionItems = [
    ...warnings.slice(0, 4).map((warning) => ({
      title: humanizeStatusLabel(warning.severity || "warning"),
      detail: warning.message,
      tone: executiveStatusColor(warning.severity),
    })),
    ...(staleProgress > 0
      ? [{ title: "Campaign progress paused", detail: `${countValue(staleProgress)} campaigns have not updated recently.`, tone: "#f59e0b" }]
      : []),
    ...(failedJobs > 0
      ? [{ title: "Background work failed", detail: `${countValue(failedJobs)} job failures were reported recently.`, tone: "#ef4444" }]
      : []),
    ...(failedMessages > 0
      ? [{ title: "Message delivery failed", detail: `${countValue(failedMessages)} sends need review.`, tone: "#ef4444" }]
      : []),
    ...(stuckMessages > 0
      ? [{ title: "Messages stuck", detail: `${countValue(stuckMessages)} communication rows are waiting too long.`, tone: "#f59e0b" }]
      : []),
    ...(providerFailures > 0
      ? [{ title: "Provider failures", detail: `${countValue(providerFailures)} provider failures in the last 24 hours.`, tone: "#ef4444" }]
      : []),
  ].slice(0, 6);
  const generatedAt = snapshot?.generatedAt ? formatDateTime(snapshot.generatedAt) : "-";

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-transparent p-1 font-sans text-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 border-b border-zinc-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">CEO Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">System Health</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            A business-level view of platform readiness, campaign movement, communication flow, and items that need attention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500 shadow-[0_12px_36px_-30px_rgba(15,23,42,0.8)]">
            Updated {generatedAt}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-10 border-zinc-200 bg-white px-4 text-zinc-700 shadow-[0_12px_36px_-30px_rgba(15,23,42,0.8)] hover:bg-zinc-50"
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
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-300 bg-white/84 p-8">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading system health...
          </div>
        </Card>
      ) : null}

      {!loading && !snapshot && !error ? (
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-300 bg-white/84 p-8 text-sm text-zinc-500">
          No system health snapshot is available.
        </Card>
      ) : null}

      {snapshot ? (
        <div className="space-y-8">
          <CeoReportGroup
            eyebrow="01"
            title="Executive summary"
            description="High-level platform readiness and the two indicators a CEO should check first."
          >
            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="overflow-hidden rounded-[1.35rem] border border-zinc-200/90 bg-white py-0 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.7)] xl:col-span-12">
                <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                  <HealthGauge score={readinessScore} status={snapshot.status} />
                  <ScoreBreakdown
                    serviceScore={serviceScore}
                    stabilityScore={stabilityScore}
                    readyServices={readyServices}
                    totalServices={serviceChecks.length}
                    attentionPressure={attentionPressure}
                  />
                </div>
                <div className="grid gap-3 border-t border-zinc-100 bg-zinc-50/45 p-4 lg:grid-cols-5">
                  <div className="grid gap-3 md:grid-cols-3 lg:col-span-3">
                    {serviceChecks.map((item) => (
                      <ServiceTile key={item.label} label={item.label} detail={item.detail} status={item.status} />
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                    <CeoMetricCard
                      label="Campaigns active"
                      value={countValue(runtime?.pipelines?.activeTotal)}
                      detail="Campaigns currently moving through the platform."
                      icon={TrendingUp}
                      tone="blue"
                    />
                    <CeoMetricCard
                      label="Needs attention"
                      value={countValue(attentionItems.length)}
                      detail={attentionItems.length ? "Items that may need the operations team." : "No visible attention items right now."}
                      icon={attentionItems.length ? AlertTriangle : CheckCircle2}
                      tone={attentionItems.length ? "amber" : "emerald"}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </CeoReportGroup>

          <CeoReportGroup
            eyebrow="02"
            title="Business flow"
            description="Campaign movement and the current mix of work states across Sales, Delegate, and Production."
          >
            <div className="grid items-stretch gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <CeoSection title="Campaign Movement" description="How work is distributed across the three business teams.">
                  <div className="grid min-h-[24rem] gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="h-72 min-w-0">
                      {hasDepartmentData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={departmentRows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                            <Tooltip cursor={{ fill: "rgba(24,24,27,0.04)" }} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                              {departmentRows.map((entry) => (
                                <Cell key={entry.key} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyInsight label="No campaign movement data available." />
                      )}
                    </div>
                    <div className="grid content-center gap-3">
                      {departmentRows.map((row) => (
                        <div key={row.key} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                              {row.label}
                            </span>
                            <span className="text-lg font-semibold text-zinc-950">{countValue(row.count)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CeoSection>
              </div>

              <div className="xl:col-span-5">
                <CeoSection title="Work Status Mix" description="The biggest status groups across active campaigns.">
                  <div className="min-h-[24rem] p-6">
                    {statusRows.length > 0 ? (
                      <div className="grid h-full content-center gap-5">
                        {statusRows.map((row) => {
                          const max = Math.max(...statusRows.map((item) => item.count), 1);
                          return (
                            <div key={row.label}>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-zinc-700">{row.label}</span>
                                <span className="font-semibold text-zinc-950">{countValue(row.count)}</span>
                              </div>
                              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.max(4, (row.count / max) * 100)}%`, backgroundColor: row.fill }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyInsight label="No status information available." />
                    )}
                  </div>
                </CeoSection>
              </div>
            </div>
          </CeoReportGroup>

          <CeoReportGroup
            eyebrow="03"
            title="Delivery and risk"
            description="Communication queue pressure and the issues that need business attention."
          >
            <div className="grid items-stretch gap-4 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <CeoSection title="Communication Flow" description="Message delivery pressure across communication channels.">
                  <div className="grid min-h-[22rem] gap-5 p-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
                    <div className="h-52 self-center">
                      {queueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip />
                            <Pie data={queueData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                              {queueData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyInsight label="No queued messages." />
                      )}
                    </div>
                    <div className="grid content-center gap-3">
                      <CeoMetricCard
                        label="Messages waiting"
                        value={countValue(runtime?.sendQueue?.openTotal)}
                        detail="Still scheduled or ready to be delivered."
                        icon={Send}
                        tone="cyan"
                      />
                      <CeoMetricCard
                        label="Delivery issues"
                        value={countValue(failedMessages + stuckMessages)}
                        detail="Failed or stuck sends that may need review."
                        icon={AlertTriangle}
                        tone={failedMessages + stuckMessages > 0 ? "rose" : "emerald"}
                      />
                    </div>
                  </div>
                </CeoSection>
              </div>

              <div className="xl:col-span-7">
                <CeoSection title="Needs Attention" description="Only items that may require follow-up are shown here.">
                  <div className="min-h-[22rem] p-5">
                    {attentionItems.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {attentionItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="flex gap-3 rounded-xl border border-zinc-200 bg-white/88 p-4">
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.tone }} />
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-950">{item.title}</p>
                              <p className="mt-1 text-sm leading-5 text-zinc-500">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        <p className="mt-3 text-lg font-semibold text-emerald-900">No attention items</p>
                        <p className="mt-1 text-sm text-emerald-700">The platform looks clear from the CEO monitor.</p>
                      </div>
                    )}
                  </div>
                </CeoSection>
              </div>
            </div>
          </CeoReportGroup>

          <CeoReportGroup
            eyebrow="04"
            title="Operations snapshot"
            description="Compact supporting indicators for background work, profile progress, and provider reliability."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <CeoMetricCard
                label="Background work"
                value={countValue(runtime?.jobs?.activeTotal)}
                detail={`${countValue(failedJobs)} recent failures`}
                icon={Server}
                tone={failedJobs > 0 ? "amber" : "emerald"}
              />
              <CeoMetricCard
                label="Profile progress"
                value={countValue(runtime?.progress?.runningTotal)}
                detail={`${countValue(staleProgress)} paused or stale`}
                icon={BarChart3}
                tone={staleProgress > 0 ? "amber" : "blue"}
              />
              <CeoMetricCard
                label="Provider reliability"
                value={countValue(providerFailures)}
                detail="Failures recorded in the last 24 hours"
                icon={Activity}
                tone={providerFailures > 0 ? "rose" : "emerald"}
              />
            </div>
          </CeoReportGroup>
        </div>
      ) : null}
    </div>
  );
}

export default function SystemMonitorPage() {
  const { isAdminLike, isSuperAdmin, isCeo } = useAuth();
  const [snapshot, setSnapshot] = useState<SystemMonitorSnapshot | null>(null);
  const [operationIncidents, setOperationIncidents] = useState<SystemOperationIncident[]>([]);
  const [logServices, setLogServices] = useState<SystemOperationLogService[]>([]);
  const [recoveryItems, setRecoveryItems] = useState<SystemOperationRecoveryGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!isAdminLike) return;

      if (!silent) setLoading(true);
      setRefreshing(true);
      setError(null);
      try {
        if (isCeo) {
          const snapshotResult = await fetchSystemMonitorSnapshot();
          setSnapshot(snapshotResult);
          setOperationIncidents([]);
          setLogServices([]);
          setRecoveryItems([]);
          return;
        }

        const [snapshotResult, incidentsResult, logServicesResult, recoveryGuideResult] = await Promise.allSettled([
          fetchSystemMonitorSnapshot(),
          listSystemOperationIncidents(10),
          listSystemOperationLogServices(),
          fetchSystemOperationRecoveryGuide(),
        ]);
        if (snapshotResult.status === "rejected") throw snapshotResult.reason;
        setSnapshot(snapshotResult.value);
        setOperationIncidents(incidentsResult.status === "fulfilled" ? incidentsResult.value.incidents || [] : []);
        setLogServices(logServicesResult.status === "fulfilled" ? logServicesResult.value.services || [] : []);
        setRecoveryItems(recoveryGuideResult.status === "fulfilled" ? recoveryGuideResult.value.items || [] : []);
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error("System monitor load failed", { description: message });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdminLike, isCeo]
  );

  useEffect(() => {
    if (isAdminLike) void loadSnapshot();
  }, [isAdminLike, loadSnapshot]);

  useEffect(() => {
    if (!autoRefresh || !isAdminLike) return;
    const timer = window.setInterval(() => {
      void loadSnapshot({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, isAdminLike, loadSnapshot]);

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
  const monitoringLinks = snapshot?.monitoringLinks ?? {};

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

  if (!isAdminLike) {
    return (
      <AdminPanelShell>
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
        <Card className="max-w-md rounded-2xl border border-zinc-300 bg-white/88 p-6 text-center">
          <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">Admin Access Required</h1>
          <p className="mt-2 text-sm text-zinc-500">System Monitor is restricted to super admin and CEO users.</p>
        </Card>
      </div>
      </AdminPanelShell>
    );
  }

  if (isCeo) {
    return (
      <AdminPanelShell>
        <CeoSystemMonitorView
          snapshot={snapshot}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onRefresh={() => void loadSnapshot()}
        />
      </AdminPanelShell>
    );
  }

  return (
    <AdminPanelShell>
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
          <ExternalDashboardButton label="Open Grafana" href={monitoringLinks.grafana} />

          <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white/90 px-3 text-xs font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Auto 30s
          </label>

          <Link href={isSuperAdmin ? "/settings" : "/dashboard"}>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-zinc-300 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isSuperAdmin ? "Settings" : "Dashboard"}
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
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-300 bg-white/84 p-8">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading system monitor...
          </div>
        </Card>
      ) : null}

      {!loading && !snapshot && !error ? (
        <Card className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-zinc-300 bg-white/84 p-8 text-sm text-zinc-500">
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

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Operation Incidents"
              value={operationIncidents.length}
              status={operationIncidents.length > 0 ? "warning" : "ok"}
              detail="System operations summary"
              icon={AlertTriangle}
            />
            <MetricCard
              label="Log Services"
              value={logServices.length}
              status={logServices.some((service) => !service.exists) ? "warning" : "ok"}
              detail={`${logServices.filter((service) => service.exists).length} available`}
              icon={Activity}
            />
            <MetricCard
              label="Recovery Guide Items"
              value={recoveryItems.length}
              status="info"
              detail="Read-only reference count"
              icon={Workflow}
            />
          </div>

          <SectionCard title="Operations Summary" description="Read-only incident view from system operations.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-5 py-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {operationIncidents.length === 0 ? (
                    <EmptyRow colSpan={4} label="No system operation incidents found." />
                  ) : (
                    operationIncidents.map((incident, index) => (
                      <tr key={`${incident.code}-${incident.campaignId}-${index}`} className="hover:bg-zinc-50/80">
                        <td className="px-5 py-3"><SeverityBadge value={incident.severity} /></td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-700">{incident.code}</td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-600">{incident.campaignId || "-"}</td>
                        <td className="max-w-[28rem] truncate px-5 py-3 text-sm text-zinc-700" title={incident.message}>{incident.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

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
              <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-300">
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
                <div className="rounded-xl border border-zinc-300 bg-zinc-50/70 p-4">
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

                <div className="rounded-xl border border-zinc-300 bg-white p-4">
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
              <div className="overflow-x-auto rounded-xl border border-zinc-300">
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

              <div className="overflow-x-auto rounded-xl border border-zinc-300">
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
    </AdminPanelShell>
  );
}

