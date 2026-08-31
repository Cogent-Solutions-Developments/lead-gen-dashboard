"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Check, ChevronDown, CircleDollarSign, Clock3,
  Database, Gauge, Loader2, PauseCircle, RefreshCw, RotateCcw, Save,
  ShieldCheck, Sparkles, Workflow, XCircle,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getContentGenerationConfiguration,
  getContentGenerationOverview,
  updateContentGenerationConfiguration,
  type ContentGenerationConfigChange,
  type ContentGenerationConfiguration,
  type ContentGenerationConfigurationUpdate,
  type ContentGenerationOverview,
} from "@/lib/contentGenerationAdmin";

type Draft = Omit<ContentGenerationConfigurationUpdate, "expectedVersion">;
type FieldKey = keyof Draft;

const FIELD_GROUPS: Array<{
  title: string;
  description: string;
  fields: Array<{ key: FieldKey; label: string; help: string; min: number; max: number }>;
}> = [
  {
    title: "Run hard caps",
    description: "Stops excessive fan-out before provider spend can multiply.",
    fields: [
      { key: "maxLeadsPerRun", label: "Leads per run", help: "Maximum contacts accepted in one campaign run.", min: 1, max: 1000 },
      { key: "maxRequestsPerLead", label: "Requests per lead", help: "Total model calls available to one lead across all stages.", min: 1, max: 25 },
      { key: "maxTotalTokensPerRun", label: "Tokens per run", help: "Circuit breaker for aggregate token use.", min: 10000, max: 20000000 },
    ],
  },
  {
    title: "Agent flow gates",
    description: "Constrains every stage input/output and tool boundary.",
    fields: [
      { key: "maxOutputTokens", label: "Output tokens / call", help: "Maximum provider output requested by an agent stage.", min: 256, max: 10000 },
      { key: "maxToolCalls", label: "Tool calls / request", help: "Maximum tool invocations allowed during one model request.", min: 0, max: 10 },
    ],
  },
  {
    title: "Recovery & retention",
    description: "Controls resumability, ownership leases, and checkpoint cleanup.",
    fields: [
      { key: "leadLeaseSeconds", label: "Lead lease (seconds)", help: "Exclusive ownership window for one lead worker.", min: 300, max: 14400 },
      { key: "runLeaseSeconds", label: "Run lease (seconds)", help: "Exclusive campaign single-flight ownership window.", min: 600, max: 43200 },
      { key: "checkpointRetentionDays", label: "Checkpoint retention (days)", help: "Successful temporary state is deleted after this period.", min: 1, max: 90 },
    ],
  },
];

const STATE_COLORS: Record<string, string> = {
  succeeded: "#10b981", running: "#2563eb", queued: "#60a5fa",
  paused: "#f59e0b", failed: "#ef4444", cancelled: "#64748b",
};
const DEFAULT_CHART_COLOR = "#8b5cf6";

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function draftFromConfig(config: ContentGenerationConfiguration): Draft {
  return {
    maxLeadsPerRun: config.maxLeadsPerRun,
    maxRequestsPerLead: config.maxRequestsPerLead,
    maxTotalTokensPerRun: config.maxTotalTokensPerRun,
    maxOutputTokens: config.maxOutputTokens,
    maxToolCalls: config.maxToolCalls,
    checkpointRetentionDays: config.checkpointRetentionDays,
    leadLeaseSeconds: config.leadLeaseSeconds,
    runLeaseSeconds: config.runLeaseSeconds,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "The request could not be completed.";
}

function MetricCard({ icon: Icon, label, value, note, tone }: {
  icon: typeof Activity;
  label: string;
  value: string;
  note: string;
  tone: "blue" | "emerald" | "amber" | "violet";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <div className={`rounded-lg p-2 ring-1 ${styles}`}><Icon className="h-4 w-4" /></div>
      </div>
    </div>
  );
}

function BudgetBar({ label, value, detail, tone = "blue" }: {
  label: string;
  value: number;
  detail: string;
  tone?: "blue" | "amber";
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${label} ${safe.toFixed(1)} percent`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone === "amber" ? "bg-amber-500" : "bg-blue-600"}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

export function ContentGenerationControlCenter() {
  const [configuration, setConfiguration] = useState<ContentGenerationConfiguration | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [overview, setOverview] = useState<ContentGenerationOverview | null>(null);
  const [recentChanges, setRecentChanges] = useState<ContentGenerationConfigChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false, replaceDraft = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    const [configurationResult, overviewResult] = await Promise.allSettled([
      getContentGenerationConfiguration(),
      getContentGenerationOverview(14, 8),
    ]);
    const failures: string[] = [];
    if (configurationResult.status === "fulfilled") {
      setConfiguration(configurationResult.value.configuration);
      setRecentChanges(configurationResult.value.recentChanges ?? []);
      if (replaceDraft) setDraft(draftFromConfig(configurationResult.value.configuration));
      else setDraft((current) => current ?? draftFromConfig(configurationResult.value.configuration));
    } else failures.push(errorMessage(configurationResult.reason));
    if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
    else failures.push(errorMessage(overviewResult.reason));
    setLoadError(failures.length ? failures.join(" ") : null);
    if (failures.length === 0) setLastSynced(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const dirty = useMemo(() => configuration && draft
    ? JSON.stringify(draft) !== JSON.stringify(draftFromConfig(configuration))
    : false, [configuration, draft]);

  const invalidFields = useMemo(() => {
    if (!draft) return new Set<FieldKey>();
    const invalid = new Set<FieldKey>();
    for (const group of FIELD_GROUPS) for (const field of group.fields) {
      const value = draft[field.key];
      if (!Number.isInteger(value) || value < field.min || value > field.max) invalid.add(field.key);
    }
    if (draft.runLeaseSeconds < draft.leadLeaseSeconds) invalid.add("runLeaseSeconds");
    return invalid;
  }, [draft]);

  const save = async () => {
    if (!draft || !configuration || invalidFields.size) {
      toast.error("Review the highlighted guardrails before saving.");
      return;
    }
    try {
      setSaving(true);
      const response = await updateContentGenerationConfiguration({
        ...draft,
        expectedVersion: configuration.version,
      });
      setConfiguration(response.configuration);
      setDraft(draftFromConfig(response.configuration));
      toast.success("Content generation guardrails updated", {
        description: `Database configuration v${response.configuration.version} is active for new runs.`,
      });
      await load(true);
    } catch (error) {
      toast.error("Configuration was not saved", { description: errorMessage(error) });
      if ((error as { status?: number })?.status === 409) await load(true, true);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !configuration && !overview) {
    return (
      <Card className="border-slate-200 p-10">
        <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Loading content generation controls…
        </div>
      </Card>
    );
  }

  const summary = overview?.summary;
  const activeStages = overview?.activeStageFlow ?? [];
  const activeCheckpoints = overview?.activeCheckpoints ?? [];
  const maxStageCount = Math.max(1, ...activeStages.map((item) => item.count));

  return (
    <section className="space-y-4" data-testid="content-generation-control-center">
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/60 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">Content Generation Control Center</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Database className="h-3 w-3" />DB managed
                  </span>
                  {configuration ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">v{configuration.version}</span> : null}
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Set durable cost limits, inspect every active stage, and verify that paused work resumes from its last atomic checkpoint.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-slate-500">
                {refreshing ? "Syncing…" : lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synced"}
              </span>
              <Button type="button" variant="outline" className="border-slate-300 bg-white" onClick={() => void load(true)} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button type="button" className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => setConfigOpen((open) => !open)} aria-expanded={configOpen}>
                <Gauge className="mr-2 h-4 w-4" />Manage limits
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${configOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>
          {loadError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Some control-center data is unavailable. {loadError}</span>
            </div>
          ) : null}
        </div>

        {configOpen && draft && configuration ? (
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6" data-testid="content-generation-configuration">
            <div className="grid gap-4 xl:grid-cols-3">
              {FIELD_GROUPS.map((group) => (
                <fieldset key={group.title} className="rounded-xl border border-slate-200 bg-white p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-900">{group.title}</legend>
                  <p className="mb-4 text-xs leading-5 text-slate-500">{group.description}</p>
                  <div className="space-y-4">
                    {group.fields.map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-1 flex items-center justify-between gap-3 text-xs font-medium text-slate-700">
                          <span>{field.label}</span><span className="font-normal text-slate-400">{field.min.toLocaleString()}–{field.max.toLocaleString()}</span>
                        </span>
                        <Input
                          type="number" min={field.min} max={field.max} step={1}
                          value={draft[field.key]}
                          aria-invalid={invalidFields.has(field.key)}
                          className={invalidFields.has(field.key) ? "border-red-400 ring-red-100" : "border-slate-300"}
                          onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
                        />
                        <span className={`mt-1 block text-[11px] leading-4 ${invalidFields.has(field.key) ? "text-red-600" : "text-slate-500"}`}>
                          {field.key === "runLeaseSeconds" && invalidFields.has(field.key) ? "Run lease must be at least the lead lease." : field.help}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2 text-xs leading-5 text-blue-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>Effective ceiling:</strong> {compactNumber(draft.maxLeadsPerRun * draft.maxRequestsPerLead)} provider requests per run. Changes are versioned, audited, and apply to new work.</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" className="border-slate-300 bg-white" disabled={!dirty || saving} onClick={() => setDraft(draftFromConfig(configuration))}>
                  <RotateCcw className="mr-2 h-4 w-4" />Reset
                </Button>
                <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={!dirty || saving || invalidFields.size > 0} onClick={() => void save()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save guardrails
                </Button>
              </div>
            </div>
            {recentChanges.length ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4" data-testid="generation-config-audit">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Recent configuration changes</h4>
                    <p className="text-xs text-slate-500">Immutable database audit entries for administrator updates.</p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Latest {Math.min(3, recentChanges.length)}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentChanges.slice(0, 3).map((change) => (
                    <div key={change.id} className="flex flex-col justify-between gap-1 py-2 text-xs sm:flex-row sm:items-center">
                      <span className="font-medium text-slate-700">Version {change.version} · {change.changedByUsername || "system"}</span>
                      <span className="text-slate-500">{formatDate(change.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Workflow} label="Runs · 14 days" value={compactNumber(summary?.totalRuns ?? 0)} note={`${summary?.activeRuns ?? 0} active now`} tone="blue" />
            <MetricCard icon={CircleDollarSign} label="Model requests" value={compactNumber(summary?.requests ?? 0)} note={`${(summary?.requestBudgetUtilization ?? 0).toFixed(1)}% aggregate budget`} tone="violet" />
            <MetricCard icon={ShieldCheck} label="Successful" value={compactNumber(summary?.successfulRuns ?? 0)} note={`${summary?.budgetStops ?? 0} budget stops`} tone="emerald" />
            <MetricCard icon={PauseCircle} label="Paused / failed" value={`${summary?.pausedRuns ?? 0} / ${summary?.failedRuns ?? 0}`} note={`${summary?.cancelledRuns ?? 0} cancelled`} tone="amber" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><h3 className="font-semibold text-slate-900">Usage trajectory</h3><p className="text-xs text-slate-500">Daily provider requests and token volume for the last 14 days.</p></div>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">Auto-refresh · 30s</span>
          </div>
          <div className="h-64 w-full" data-testid="generation-usage-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.dailyUsage ?? []} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="tokensFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })} />
                <YAxis yAxisId="tokens" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={compactNumber} />
                <YAxis yAxisId="requests" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#cbd5e1", fontSize: 12 }} />
                <Area yAxisId="tokens" type="monotone" dataKey="tokens" name="Tokens" stroke="#2563eb" strokeWidth={2} fill="url(#tokensFill)" isAnimationActive={false} />
                <Area yAxisId="requests" type="monotone" dataKey="requests" name="Requests" stroke="#8b5cf6" strokeWidth={2} fill="transparent" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div><h3 className="font-semibold text-slate-900">Run outcomes</h3><p className="text-xs text-slate-500">Distribution across durable run states.</p></div>
          <div className="mt-2 grid min-h-64 grid-cols-[1fr_0.9fr] items-center gap-2">
            <div className="h-52" data-testid="generation-state-chart">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview?.stateDistribution ?? []} dataKey="count" nameKey="state" innerRadius={52} outerRadius={78} paddingAngle={3} isAnimationActive={false}>{(overview?.stateDistribution ?? []).map((item) => <Cell key={item.state} fill={STATE_COLORS[item.state.toLowerCase()] ?? DEFAULT_CHART_COLOR} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#cbd5e1", fontSize: 12 }} /></PieChart></ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {(overview?.stateDistribution ?? []).length ? overview?.stateDistribution.map((item) => (
                <div key={item.state} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATE_COLORS[item.state.toLowerCase()] ?? DEFAULT_CHART_COLOR }} /><span className="truncate">{humanize(item.state)}</span></span>
                  <strong className="tabular-nums text-slate-900">{item.count}</strong>
                </div>
              )) : <p className="text-xs text-slate-500">No runs in this window.</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4"><h3 className="font-semibold text-slate-900">Live stage flow</h3><p className="text-xs text-slate-500">Where active leads are waiting, processing, paused, or recovering.</p></div>
          <div className="space-y-3" data-testid="generation-stage-flow">
            {activeStages.length ? activeStages.slice(0, 8).map((item) => (
              <div key={`${item.stage}-${item.state}`} className="grid grid-cols-[minmax(100px,0.8fr)_minmax(120px,1fr)_auto] items-center gap-3 text-xs">
                <span className="truncate font-medium text-slate-700">{humanize(item.stage)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(5, item.count / maxStageCount * 100)}%` }} /></div>
                <span className="min-w-16 text-right tabular-nums text-slate-500">{item.count} · {humanize(item.state)}</span>
              </div>
            )) : (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center">
                <Check className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-sm font-medium text-slate-700">No active stage backlog</p><p className="text-xs text-slate-500">All work is complete or waiting for a new campaign.</p>
              </div>
            )}
          </div>
          {activeCheckpoints.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3" data-testid="generation-checkpoint-ledger">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Atomic checkpoint ledger</p>
              <div className="flex flex-wrap gap-2">
                {activeCheckpoints.slice(0, 6).map((item) => (
                  <span key={`${item.node}-${item.state}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                    {humanize(item.node)} · {humanize(item.state)} · {item.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4"><h3 className="font-semibold text-slate-900">Safety interpretation</h3><p className="text-xs text-slate-500">A quick reading of current generation efficiency and protection.</p></div>
          <div className="space-y-5">
            <BudgetBar label="Request budget used" value={summary?.requestBudgetUtilization ?? 0} detail={`${(summary?.requestBudgetUtilization ?? 0).toFixed(1)}%`} />
            <BudgetBar label="Token budget used" value={summary?.tokenBudgetUtilization ?? 0} detail={`${(summary?.tokenBudgetUtilization ?? 0).toFixed(1)}%`} tone={(summary?.tokenBudgetUtilization ?? 0) > 80 ? "amber" : "blue"} />
            <BudgetBar label="Cached research reuse" value={summary?.cachedInputRate ?? 0} detail={`${(summary?.cachedInputRate ?? 0).toFixed(1)}%`} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900"><ShieldCheck className="mb-2 h-4 w-4" /><strong className="block">Single-flight protected</strong><span className="text-emerald-700">Campaign leases prevent duplicate concurrent runs.</span></div>
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900"><Database className="mb-2 h-4 w-4" /><strong className="block">Atomic recovery</strong><span className="text-blue-700">Stage checkpoints support pause and resume without restart.</span></div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div><h3 className="font-semibold text-slate-900">Recent generation runs</h3><p className="text-xs text-slate-500">Progress, checkpoints, and budget status for the latest campaigns.</p></div>
          <span className="text-xs text-slate-500">Configuration updated {formatDate(configuration?.updatedAt)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Campaign / run</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Current checkpoint</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Usage</th><th className="px-5 py-3 text-right">Updated</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.recentRuns ?? []).length ? overview?.recentRuns.map((run) => (
                <tr key={run.id} className="bg-white hover:bg-slate-50/70">
                  <td className="px-5 py-3"><strong className="block max-w-44 truncate text-xs text-slate-900">{run.campaignId}</strong><span className="font-mono text-[10px] text-slate-400">{run.id.slice(0, 12)}{run.configurationVersion ? ` · limits v${run.configurationVersion}` : ""}</span></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATE_COLORS[run.state.toLowerCase()] ?? DEFAULT_CHART_COLOR }} />{humanize(run.state)}</span>
                    {run.pauseRequested ? <span className="ml-1 text-amber-600" title="Pause requested"><PauseCircle className="inline h-4 w-4" /></span> : null}
                    {run.budgetExhausted ? <span className="ml-1 text-red-600" title="Budget exhausted"><XCircle className="inline h-4 w-4" /></span> : null}
                  </td>
                  <td className="px-4 py-3"><span className="block text-xs font-medium text-slate-700">{humanize(run.step || "pending")}</span><span className="block max-w-52 truncate text-[11px] text-slate-500">{run.message || "Waiting for checkpoint update"}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, run.progress))}%` }} /></div><span className="text-xs tabular-nums text-slate-500">{run.progress}%</span></div></td>
                  <td className="px-4 py-3"><span className="block text-xs tabular-nums text-slate-700">{compactNumber(run.usage.requests)} req · {compactNumber(run.usage.totalTokens)} tok</span><span className="text-[11px] text-slate-500">{run.usage.toolCalls} tool calls</span></td>
                  <td className="px-5 py-3 text-right text-xs text-slate-500"><Clock3 className="mr-1 inline h-3 w-3" />{formatDate(run.updatedAt)}</td>
                </tr>
              )) : <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">No content generation runs were recorded in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
