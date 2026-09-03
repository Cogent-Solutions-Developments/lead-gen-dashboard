"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  Server,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchLiveSystemMonitor, fetchSystemMonitorSnapshot } from "@/lib/auth";
import {
  deliveryDistribution,
  pressureLevel,
  safeDashboardLink,
  utilization,
} from "@/lib/systemMonitor";
import { useMonitorPolling } from "@/hooks/useMonitorPolling";

const PALETTE = {
  blue: "#2563eb",
  green: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  gray: "#94a3b8",
};
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
  fontSize: 12,
};
const count = (value: number | null | undefined) =>
  value == null ? "—" : value.toLocaleString();
const timeLabel = (value: number | string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
const fullTime = (value: number | string) =>
  new Date(value).toLocaleTimeString();

function Panel({
  title,
  detail,
  control,
  children,
}: {
  title: string;
  detail: string;
  control?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {detail}
          </p>
        </div>
        {control}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-blue-600">{children}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </Card>
  );
}

function CapacityBar({
  label,
  used,
  limit,
  detail,
}: {
  label: string;
  used: number | null | undefined;
  limit: number | null | undefined;
  detail: string;
}) {
  const value = utilization(used, limit);
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count(used)} / {count(limit)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value == null ? undefined : Math.min(100, value)}
        aria-valuetext={value == null ? "Unavailable" : `${value}%`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{
            width: `${Math.min(100, value || 0)}%`,
            background:
              value != null && value >= 85
                ? PALETTE.rose
                : value != null && value >= 60
                  ? PALETTE.amber
                  : PALETTE.blue,
          }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function LiveSystemMonitor() {
  const [live, setLive] = useState(true);
  const [minutes, setMinutes] = useState(15);
  const [refreshKey, setRefreshKey] = useState(0);
  const [metric, setMetric] = useState<
    "requestsPerSecond" | "avgResponseMs" | "serverErrors"
  >("requestsPerSecond");
  const [channel, setChannel] = useState("email");
  const [department, setDepartment] = useState("all");
  const loadTraffic = useCallback(
    (signal: AbortSignal) => fetchLiveSystemMonitor(minutes, signal),
    [minutes],
  );
  const loadHealth = useCallback(
    (signal: AbortSignal) => fetchSystemMonitorSnapshot(signal),
    [],
  );
  const trafficPoll = useMonitorPolling(loadTraffic, 5000, live, refreshKey);
  const healthPoll = useMonitorPolling(loadHealth, 30000, live, refreshKey);
  const data = trafficPoll.data;
  const health = healthPoll.data;
  const telemetryReady = data?.traffic.status === "ok";
  const minute =
    telemetryReady && data.traffic.lastMinute?.observedSeconds
      ? data.traffic.lastMinute
      : null;
  const apiPercent = telemetryReady
    ? utilization(data?.traffic.inFlight, data?.traffic.concurrencyTarget)
    : null;
  const dbPercent =
    data?.database.status === "ok"
      ? utilization(data.database.used, data.database.limit)
      : null;
  const knownPressure = [apiPercent, dbPercent].filter(
    (value): value is number => value != null,
  );
  const pressure = knownPressure.length ? Math.max(...knownPressure) : null;
  const level = pressureLevel(pressure);
  const pressureColor =
    level === "High"
      ? PALETTE.rose
      : level === "Busy"
        ? PALETTE.amber
        : level === "Normal"
          ? PALETTE.green
          : PALETTE.gray;
  const partialPressure = knownPressure.length === 1;
  const gradientId = `traffic-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const errors = [trafficPoll.error, healthPoll.error].filter(Boolean);
  const offline = trafficPoll.suspended === "offline";
  const stale = errors.length > 0 || offline;
  const connectionLabel = offline
    ? "Offline"
    : stale
      ? "Update interrupted"
      : !live
        ? "Paused"
        : trafficPoll.suspended
          ? "Paused in background"
          : telemetryReady
            ? "Live · 5s"
            : data
              ? "Telemetry unavailable"
              : "Connecting";
  const loading =
    !data && !health && (trafficPoll.pending || healthPoll.pending);
  const pointLabel =
    metric === "requestsPerSecond"
      ? "Requests / sec"
      : metric === "avgResponseMs"
        ? "Response time (ms)"
        : "Server errors / 10 sec";
  const points = data?.traffic.points ?? [];
  const hasPoints = points.some((point) => point.observed);
  const runtime = health?.runtime;
  const queueAvailable = Boolean(
    runtime?.sendQueue && !runtime.sendQueue.error,
  );
  const distribution = deliveryDistribution(
    runtime?.sendQueue?.byChannelStatus ?? [],
    channel,
  );
  const deliveryTotal = distribution.reduce((sum, item) => sum + item.value, 0);
  const outcome = minute
    ? [
        {
          name: "Accepted · 2xx/3xx",
          value: minute.accepted,
          color: PALETTE.green,
        },
        {
          name: "Needs review · 4xx",
          value: minute.clientErrors,
          color: PALETTE.amber,
        },
        {
          name: "Server errors · 5xx",
          value: minute.serverErrors,
          color: PALETTE.rose,
        },
      ]
    : [];
  const workload = useMemo(() => {
    const rows = ["sales", "delegate", "production"].map((key) => ({
      key,
      name: key[0].toUpperCase() + key.slice(1),
      Running: 0,
      Ready: 0,
      Completed: 0,
      Attention: 0,
      Other: 0,
    }));
    for (const row of runtime?.pipelines?.byPipelineStatus ?? []) {
      const target = rows.find(
        (item) => item.key === row.pipeline.toLowerCase(),
      );
      if (!target) continue;
      const status = row.status.toLowerCase();
      const group = [
        "created",
        "running",
        "keywords_ready",
        "scrape_ready",
        "content_generating",
      ].includes(status)
        ? "Running"
        : status === "content_ready"
          ? "Ready"
          : ["completed", "success"].includes(status)
            ? "Completed"
            : ["failed", "error"].includes(status)
              ? "Attention"
              : "Other";
      target[group] += row.count;
    }
    return department === "all"
      ? rows
      : rows.filter((row) => row.key === department);
  }, [runtime?.pipelines?.byPipelineStatus, department]);
  const signals = [
    {
      title: "Campaigns need a check",
      value: runtime?.progress?.error
        ? null
        : runtime?.progress?.staleRunningTotal,
      detail:
        "Progress has not updated recently. Inspect before recovering work.",
    },
    {
      title: "Recent job failures",
      value: runtime?.jobs?.error ? null : runtime?.jobs?.failedRecent,
      detail: "Jobs marked failed in the last hour.",
    },
    {
      title: "Messages appear stuck",
      value: runtime?.sendQueue?.error ? null : runtime?.sendQueue?.stuckTotal,
      detail: "A message worker has held the same job for over 15 minutes.",
    },
  ];
  const services = [
    {
      name: "Lead database",
      note: "Stores campaigns and contacts",
      check: health?.checks?.database,
      icon: Database,
    },
    {
      name: "Coordination",
      note: "Connects requests and background work",
      check: health?.checks?.redis,
      icon: Zap,
    },
    {
      name: "Background workers",
      note:
        health?.checks?.celery?.workerCount != null
          ? `${health.checks.celery.workerCount} workers responding`
          : "Checking worker availability",
      check: health?.checks?.celery,
      icon: Server,
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            System Monitor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live pulse of your platform. See what is moving and what needs
            attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`mr-1 inline-flex items-center gap-2 text-xs font-medium ${stale ? "text-amber-700" : "text-muted-foreground"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${stale ? "bg-amber-500" : live && telemetryReady && !trafficPoll.suspended ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {connectionLabel}
          </span>
          <Button variant="outline" size="sm" onClick={() => setLive(!live)}>
            {live ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {live ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={trafficPoll.pending || healthPoll.pending}
            onClick={() => setRefreshKey((key) => key + 1)}
            aria-label="Refresh monitor"
          >
            <RefreshCw
              className={`h-4 w-4 ${trafficPoll.pending ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </Button>
        </div>
      </header>

      {stale ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Live updates are interrupted. Values below are the last available
          snapshot, not current readings. {errors[0]}
        </div>
      ) : null}
      {loading ? (
        <div
          role="status"
          className="rounded-xl border border-border p-4 text-sm text-muted-foreground"
        >
          Connecting to activity and service health…
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Active users"
          value={
            data?.audience.status === "ok"
              ? count(data.audience.activeUsers)
              : "—"
          }
          note={`Unique users active within ${data?.audience.windowSeconds ?? 120} seconds. Based on app heartbeats.`}
        >
          <Users className="h-5 w-5" />
        </Metric>
        <Metric
          label="Requests · last minute"
          value={count(minute?.requests)}
          note={
            minute && minute.observedSeconds < 60
              ? `Warming up · ${minute.observedSeconds}s of the last minute observed`
              : "API activity, excluding monitoring and heartbeat traffic"
          }
        >
          <Activity className="h-5 w-5" />
        </Metric>
        <Metric
          label="Average response"
          value={
            minute?.avgResponseMs == null
              ? "—"
              : `${count(Math.round(minute.avgResponseMs))} ms`
          }
          note="Response duration for requests completed in the last minute"
        >
          <Clock3 className="h-5 w-5" />
        </Metric>
        <Metric
          label="Changes accepted · last minute"
          value={count(minute?.acceptedWrites)}
          note="Successful API write requests; not completed background jobs"
        >
          <CheckCircle2 className="h-5 w-5" />
        </Metric>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel
          title="System pressure"
          detail="Capacity indicators, not a CPU measurement"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              role="meter"
              aria-label="System pressure"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                pressure == null ? undefined : Math.min(100, pressure)
              }
              aria-valuetext={level}
              style={{
                background: `conic-gradient(${pressureColor} ${Math.min(100, pressure ?? 0) * 3.6}deg, var(--muted) 0deg)`,
              }}
            >
              <div className="grid h-24 w-24 place-content-center rounded-full bg-card text-center">
                <span className="text-2xl font-semibold tabular-nums">
                  {pressure == null ? "—" : `${pressure}%`}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  utilization
                </span>
              </div>
            </div>
            <div>
              <p
                className="text-xl font-semibold"
                style={{ color: pressureColor }}
              >
                {level}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {level === "High"
                  ? "Capacity is under pressure. Check services and queued work."
                  : level === "Busy"
                    ? "Activity is elevated. Watch response time and errors."
                    : level === "Normal"
                      ? "Measured capacity has room for more activity."
                      : "Waiting for capacity readings."}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <CapacityBar
              label="API requests in progress"
              used={telemetryReady ? data?.traffic.inFlight : null}
              limit={telemetryReady ? data?.traffic.concurrencyTarget : null}
              detail="Compared with the configured concurrency target of reporting API workers"
            />
            <CapacityBar
              label="Database connections"
              used={data?.database.used}
              limit={data?.database.limit}
              detail="Connections in use across the database server"
            />
          </div>
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium hover:text-foreground">
              How to read this
            </summary>
            <p className="mt-2 leading-5">
              The gauge uses the higher of the two measured utilization values.
              Normal: below 60%; busy: 60–84%; high: 85% or more. It is a
              pressure indicator, not a load-test guarantee.{" "}
              {partialPressure ? "Only one capacity source is available." : ""}{" "}
              API samples update approximately every 2 seconds.
            </p>
          </details>
        </Panel>

        <Panel
          title="Request activity"
          detail={`Hover over the graph to inspect a 10-second interval${data?.traffic.windowMinutes && data.traffic.windowMinutes !== minutes ? ` · Showing the previous ${data.traffic.windowMinutes}-minute window while updating` : ""}`}
          control={
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Chart metric"
                value={metric}
                onChange={(event) =>
                  setMetric(event.target.value as typeof metric)
                }
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
              >
                <option value="requestsPerSecond">Traffic</option>
                <option value="avgResponseMs">Response time</option>
                <option value="serverErrors">Server errors</option>
              </select>
              <select
                aria-label="Chart time range"
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
              >
                <option value={5}>Last 5 min</option>
                <option value={15}>Last 15 min</option>
                <option value={60}>Last hour</option>
              </select>
            </div>
          }
        >
          {hasPoints ? (
            <div
              className="h-64 min-w-0"
              aria-label={`${pointLabel} over the last ${data?.traffic.windowMinutes ?? minutes} minutes`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points}
                  accessibilityLayer
                  margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={PALETTE.blue}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={PALETTE.blue}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    vertical={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={timeLabel}
                    minTickGap={45}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={metric !== "serverErrors"}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => fullTime(Number(label))}
                  />
                  <Area
                    name={pointLabel}
                    dataKey={metric}
                    type="linear"
                    stroke={PALETTE.blue}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty>
              {trafficPoll.error || data?.traffic.status === "unavailable"
                ? "Request telemetry is unavailable. Check API collectors and Redis in System Operations."
                : "Collecting live request history. The first completed interval appears after approximately 10 seconds."}
            </Empty>
          )}
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Gaps mean no measurement, not zero traffic.</span>
            <span>
              {data?.traffic.partial
                ? "Some telemetry batches were lost; history is partial."
                : "Last complete intervals · retained for one hour"}
            </span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Core services"
          detail={`Health checks refresh every 30 seconds${health?.generatedAt ? ` · ${fullTime(health.generatedAt)}` : ""}`}
        >
          <div className="space-y-4">
            {services.map(({ name, note, check, icon: Icon }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="rounded-lg bg-muted p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {note}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${check?.status === "ok" ? "bg-emerald-50 text-emerald-700" : check?.status === "critical" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {check?.status === "ok"
                    ? "Healthy"
                    : check?.status === "critical"
                      ? "Unavailable"
                      : check?.status === "warning"
                        ? "Check"
                        : "Unknown"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/settings/system-operations"
            className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:underline"
          >
            Investigate in System Operations
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
        <Panel
          title="Request outcomes"
          detail="Completed API requests in the last minute"
        >
          {minute && minute.requests > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcome}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={63}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {outcome.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {outcome.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <strong className="ml-auto tabular-nums">
                      {count(item.value)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty>
              {minute
                ? "No requests completed in the last observed minute."
                : "Waiting for a measured traffic window."}
            </Empty>
          )}
        </Panel>
        <Panel
          title="Attention needed"
          detail="Current issues worth investigating"
        >
          <div className="space-y-3">
            {signals.map((signal) => (
              <Link
                key={signal.title}
                href="/settings/system-operations"
                className="group flex items-start gap-3 rounded-xl border border-border/70 p-3 hover:border-blue-300"
              >
                <span
                  className={`grid h-8 min-w-8 place-items-center rounded-lg text-sm font-semibold ${signal.value ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}
                >
                  {count(signal.value)}
                </span>
                <div>
                  <p className="text-xs font-semibold group-hover:text-blue-600">
                    {signal.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {signal.detail}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Message delivery flow"
        detail="Current queue records by state · this is a status distribution, not a delivery-rate funnel"
        control={
          <select
            aria-label="Delivery channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        }
      >
        {queueAvailable ? (
          <>
            <div
              className="flex h-3 overflow-hidden rounded-full bg-muted"
              aria-label={`${deliveryTotal} message queue records`}
            >
              {distribution
                .filter((item) => item.value > 0)
                .map((item) => (
                  <div
                    key={item.label}
                    title={`${item.label}: ${item.value}`}
                    style={{
                      width: `${(item.value / deliveryTotal) * 100}%`,
                      background: item.color,
                    }}
                  />
                ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {distribution.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </span>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {count(item.value)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {channel === "email"
                ? "An accepted Make webhook is not proof that an email was sent. Awaiting-result messages stay separate until confirmation arrives."
                : "These counts describe queue records. Some providers also report message status separately."}{" "}
              {deliveryTotal === 0
                ? "No queue records for this channel yet."
                : ""}
            </p>
          </>
        ) : (
          <Empty>
            Delivery data is unavailable. No zero counts are assumed.
          </Empty>
        )}
      </Panel>

      <Panel
        title="Department workload"
        detail="Current campaign records grouped by department and stage"
        control={
          <select
            aria-label="Workload department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option value="all">All departments</option>
            <option value="sales">Sales</option>
            <option value="delegate">Delegate</option>
            <option value="production">Production</option>
          </select>
        }
      >
        {runtime?.pipelines && !runtime.pipelines.error ? (
          <div className="h-60 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workload}
                layout="vertical"
                accessibilityLayer
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  horizontal={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {(
                  [
                    "Running",
                    "Ready",
                    "Completed",
                    "Attention",
                    "Other",
                  ] as const
                ).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="campaigns"
                    fill={
                      [
                        PALETTE.blue,
                        "#38bdf8",
                        PALETTE.green,
                        PALETTE.rose,
                        PALETTE.gray,
                      ][index]
                    }
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty>Department workload is not available yet.</Empty>
        )}
      </Panel>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span>
          {data?.generatedAt
            ? `Activity snapshot ${fullTime(data.generatedAt)} · auto-refresh pauses in hidden tabs`
            : "No activity snapshot received yet"}
        </span>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/settings/system-operations"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Wrench className="h-3.5 w-3.5" />
            System Operations
          </Link>
          {safeDashboardLink(health?.monitoringLinks?.grafana) ? (
            <a
              href={safeDashboardLink(health?.monitoringLinks?.grafana)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              Advanced dashboards
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
