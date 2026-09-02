"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { MagicWandIcon } from "@phosphor-icons/react/dist/csr/MagicWand";
import {
  Activity, AlertTriangle, Boxes, Check, ChevronDown, CircleDollarSign, Clock3,
  Database, Eye, Gauge, Loader2, PauseCircle, RefreshCw, RotateCcw, Save,
  ShieldCheck, Workflow, XCircle,
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
  getContentGenerationRunDetails,
  updateContentGenerationConfiguration,
  type ContentGenerationConfigChange,
  type ContentGenerationConfiguration,
  type ContentGenerationConfigurationUpdate,
  type ContentGenerationOverview,
  type ContentGenerationRunDetails,
} from "@/lib/contentGenerationAdmin";

type Draft = Omit<ContentGenerationConfigurationUpdate, "expectedVersion">;
type FieldKey = keyof Draft;
type NumericFieldKey = {
  [Key in FieldKey]: Draft[Key] extends number ? Key : never;
}[FieldKey];

const FIELD_GROUPS: Array<{
  title: string;
  description: string;
  fields: Array<{
    key: NumericFieldKey;
    label: string;
    help: string;
    min: number;
    max: number;
    step?: number;
    integer?: boolean;
  }>;
}> = [
  {
    title: "Campaign queue",
    description: "Splits large campaigns into durable batches before generation starts.",
    fields: [
      { key: "maxLeadsPerRun", label: "Leads per batch", help: "Maximum leads processed in one durable queue batch.", min: 1, max: 1000, integer: true },
      { key: "maxCampaignLeads", label: "Leads per campaign", help: "Maximum leads accepted into one campaign generation plan.", min: 1, max: 100000, integer: true },
    ],
  },
  {
    title: "Budget breakers",
    description: "Pauses work before request, token, or estimated-cost limits are exceeded.",
    fields: [
      { key: "maxRequestsPerLead", label: "Requests per lead", help: "Total model calls available to one lead across all stages.", min: 1, max: 25 },
      { key: "maxTotalTokensPerRun", label: "Tokens per batch", help: "Token circuit breaker applied to each campaign batch.", min: 10000, max: 20000000 },
      { key: "maxCostPerLeadUsd", label: "Cost per lead (USD)", help: "Target maximum estimated provider cost for one draft.", min: 0.01, max: 1, step: 0.01, integer: false },
      { key: "maxCampaignCostUsd", label: "Campaign cost (USD)", help: "Absolute cost breaker for the complete campaign run.", min: 0.1, max: 10000, step: 0.1, integer: false },
    ],
  },
  {
    title: "Agent flow gates",
    description: "Constrains every stage input/output and tool boundary.",
    fields: [
      { key: "maxOutputTokens", label: "Output tokens / call", help: "Maximum provider output requested by an agent stage.", min: 256, max: 10000, integer: true },
      { key: "maxToolCalls", label: "Tool calls / request", help: "Maximum tool invocations allowed during one model request.", min: 0, max: 10, integer: true },
    ],
  },
  {
    title: "Recovery & retention",
    description: "Controls resumability, ownership leases, and checkpoint cleanup.",
    fields: [
      { key: "leadLeaseSeconds", label: "Lead lease (seconds)", help: "Exclusive ownership window for one lead worker.", min: 300, max: 14400, integer: true },
      { key: "runLeaseSeconds", label: "Run lease (seconds)", help: "Exclusive campaign single-flight ownership window.", min: 600, max: 43200, integer: true },
      { key: "checkpointRetentionDays", label: "Checkpoint retention (days)", help: "Successful temporary state is deleted after this period.", min: 1, max: 90, integer: true },
    ],
  },
];

const STATE_COLORS: Record<string, string> = {
  succeeded: "#10b981", running: "#2563eb", queued: "#60a5fa",
  success: "#10b981", completed: "#10b981", pending: "#94a3b8",
  paused: "#f59e0b", pausing: "#f59e0b", failure: "#ef4444",
  failed: "#ef4444", cancelled: "#64748b", progress: "#2563eb",
};
const DEFAULT_CHART_COLOR = "#8b5cf6";
const MODEL_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(Number.isFinite(value) ? value : 0);
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
    maxLeadsPerRun: config.maxLeadsPerRun ?? 250,
    maxCampaignLeads: config.maxCampaignLeads ?? 10000,
    maxRequestsPerLead: config.maxRequestsPerLead,
    maxTotalTokensPerRun: config.maxTotalTokensPerRun,
    maxOutputTokens: config.maxOutputTokens,
    maxToolCalls: config.maxToolCalls,
    maxCostPerLeadUsd: config.maxCostPerLeadUsd ?? 0.1,
    maxCampaignCostUsd: config.maxCampaignCostUsd ?? 500,
    validatorModel: config.validatorModel ?? "gpt-5.6-luna",
    writerModel: config.writerModel ?? "gpt-5.6-terra",
    qaModel: config.qaModel ?? "gpt-5.6-luna",
    promptCacheEnabled: config.promptCacheEnabled ?? true,
    checkpointRetentionDays: config.checkpointRetentionDays,
    leadLeaseSeconds: config.leadLeaseSeconds,
    runLeaseSeconds: config.runLeaseSeconds,
  };
}

function StateCounts({ values, emptyLabel }: { values: Record<string, number>; emptyLabel: string }) {
  const entries = Object.entries(values);
  if (!entries.length) return <p className="text-xs text-slate-500">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {entries.map(([state, count]) => (
        <span key={state} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATE_COLORS[state.toLowerCase()] ?? DEFAULT_CHART_COLOR }} />
          {humanize(state)} <strong className="tabular-nums text-slate-900">{count}</strong>
        </span>
      ))}
    </div>
  );
}

function RunDetailsPanel({ details }: { details: ContentGenerationRunDetails }) {
  const { run, tracking } = details;
  const costUtilization = run.usage.costUtilization ?? 0;
  return (
    <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 lg:grid-cols-[0.8fr_1.2fr]" data-testid="generation-run-details">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lead states</p>
          <div className="mt-2"><StateCounts values={tracking.leadStates} emptyLabel="Lead tracking is not available yet." /></div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Checkpoint states</p>
          <div className="mt-2"><StateCounts values={tracking.checkpointStates} emptyLabel="No checkpoints have been written yet." /></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <div className="flex justify-between gap-3"><span>Estimated spend</span><strong className="tabular-nums text-slate-900">{formatUsd(run.usage.estimatedCostUsd)}</strong></div>
          <div className="mt-2 flex justify-between gap-3"><span>Campaign breaker</span><strong className="tabular-nums text-slate-900">{formatUsd(run.usage.costLimitUsd)}</strong></div>
          <div className="mt-3"><BudgetBar label="Cost budget used" value={costUtilization} detail={`${costUtilization.toFixed(1)}%`} tone={costUtilization > 80 ? "amber" : "blue"} /></div>
        </div>
      </div>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h4 className="text-sm font-semibold text-slate-900">Batch execution plan</h4><p className="text-xs text-slate-500">{tracking.batches.total} durable batch{tracking.batches.total === 1 ? "" : "es"}</p></div>
          <StateCounts values={tracking.batches.states} emptyLabel="Queue plan pending." />
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {tracking.batches.items.length ? (
            <div className="divide-y divide-slate-100">
              {tracking.batches.items.map((batch) => {
                const batchCost = (batch.usage.delta?.estimatedCostMicrousd ?? 0) / 1_000_000;
                return (
                  <div key={batch.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 text-xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 font-semibold tabular-nums text-slate-700">{batch.number}</span>
                    <div className="min-w-0"><span className="font-medium text-slate-800">{batch.leadCount} leads · {humanize(batch.state)}</span><span className="block truncate text-[11px] text-slate-500">{batch.error || `${batch.attempts} attempt${batch.attempts === 1 ? "" : "s"} · updated ${formatDate(batch.updatedAt)}`}</span></div>
                    <span className="tabular-nums text-slate-600">{formatUsd(batchCost)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="px-3 py-8 text-center text-xs text-slate-500">The durable queue plan has not been initialized.</p>}
        </div>
      </div>
    </div>
  );
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
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <Icon className={`h-5 w-5 ${styles}`} aria-hidden="true" />
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<ContentGenerationRunDetails | null>(null);
  const [runDetailsLoading, setRunDetailsLoading] = useState(false);
  const [runDetailsError, setRunDetailsError] = useState<string | null>(null);
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
    setLoadError(failures.length ? [...new Set(failures)].join(" ") : null);
    if (failures.length === 0) setLastSynced(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selectedRunId) {
      setRunDetails(null);
      setRunDetailsError(null);
      setRunDetailsLoading(false);
      return;
    }
    let active = true;
    const refreshDetails = async (quiet = false) => {
      if (!quiet) setRunDetailsLoading(true);
      try {
        const response = await getContentGenerationRunDetails(selectedRunId);
        if (!active) return;
        setRunDetails(response);
        setRunDetailsError(null);
      } catch (error) {
        if (!active) return;
        setRunDetailsError(errorMessage(error));
      } finally {
        if (active && !quiet) setRunDetailsLoading(false);
      }
    };
    void refreshDetails();
    const interval = window.setInterval(() => void refreshDetails(true), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedRunId]);

  const dirty = useMemo(() => configuration && draft
    ? JSON.stringify(draft) !== JSON.stringify(draftFromConfig(configuration))
    : false, [configuration, draft]);

  const invalidFields = useMemo(() => {
    if (!draft) return new Set<FieldKey>();
    const invalid = new Set<FieldKey>();
    for (const group of FIELD_GROUPS) for (const field of group.fields) {
      const value = draft[field.key];
      const validNumber = field.integer === false ? Number.isFinite(value) : Number.isInteger(value);
      if (!validNumber || value < field.min || value > field.max) invalid.add(field.key);
    }
    if (draft.runLeaseSeconds < draft.leadLeaseSeconds) invalid.add("runLeaseSeconds");
    if (draft.maxCampaignLeads < draft.maxLeadsPerRun) invalid.add("maxCampaignLeads");
    for (const key of ["validatorModel", "writerModel", "qaModel"] as const) {
      if (!MODEL_ID_PATTERN.test(draft[key])) invalid.add(key);
    }
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
  const activeBatches = overview?.activeBatches ?? [];
  const maxStageCount = Math.max(1, ...activeStages.map((item) => item.count));
  const totalActiveBatches = activeBatches.reduce((total, item) => total + item.count, 0);

  return (
    <section className="space-y-4" data-testid="content-generation-control-center">
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/60 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex gap-4">
              <MagicWandIcon
                size={36}
                weight="duotone"
                className="mt-0.5 shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Control Center</h2>
                <p className="mt-1 text-sm text-slate-600">Limits, usage, and workflow status.</p>
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
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Data unavailable. {loadError}</span>
            </div>
          ) : null}
        </div>

        {configOpen && draft && configuration ? (
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6" data-testid="content-generation-configuration">
            <div className="grid gap-4 xl:grid-cols-2">
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
                          type="number" min={field.min} max={field.max} step={field.step ?? 1}
                          value={draft[field.key]}
                          aria-invalid={invalidFields.has(field.key)}
                          className={invalidFields.has(field.key) ? "border-red-400 ring-red-100" : "border-slate-300"}
                          onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
                        />
                        <span className={`mt-1 block text-[11px] leading-4 ${invalidFields.has(field.key) ? "text-red-600" : "text-slate-500"}`}>
                          {field.key === "runLeaseSeconds" && invalidFields.has(field.key)
                            ? "Run lease must be at least the lead lease."
                            : field.key === "maxCampaignLeads" && invalidFields.has(field.key)
                              ? "Campaign limit must be at least the batch size."
                              : field.help}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <fieldset className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <legend className="px-1 text-sm font-semibold text-slate-900">Model routing & cache</legend>
              <p className="mb-4 text-xs leading-5 text-slate-500">Keep the quality-focused writer while routing validation and QA to efficient models.</p>
              <div className="grid gap-4 lg:grid-cols-3">
                {([
                  ["validatorModel", "Validator model", "Checks lead and research inputs."],
                  ["writerModel", "Writer model", "Produces the customer-facing draft."],
                  ["qaModel", "QA model", "Plans and verifies the final output."],
                ] as const).map(([key, label, help]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
                    <Input
                      value={draft[key]}
                      maxLength={100}
                      aria-invalid={invalidFields.has(key)}
                      className={invalidFields.has(key) ? "border-red-400 ring-red-100" : "border-slate-300"}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value.trim() })}
                    />
                    <span className={`mt-1 block text-[11px] leading-4 ${invalidFields.has(key) ? "text-red-600" : "text-slate-500"}`}>
                      {invalidFields.has(key) ? "Enter a valid provider model identifier." : help}
                    </span>
                  </label>
                ))}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <input
                  type="checkbox"
                  checked={draft.promptCacheEnabled}
                  onChange={(event) => setDraft({ ...draft, promptCacheEnabled: event.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span><strong className="block text-xs text-slate-800">Reuse cached campaign context</strong><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">Reduces repeated input-token cost without changing the content-quality gates.</span></span>
              </label>
            </fieldset>
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2 text-xs leading-5 text-blue-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>Maximum plan:</strong> {compactNumber(Math.ceil(draft.maxCampaignLeads / draft.maxLeadsPerRun))} batches, up to {compactNumber(draft.maxCampaignLeads * draft.maxRequestsPerLead)} provider requests and {formatUsd(draft.maxCampaignCostUsd)}. Changes are versioned, audited, and apply to new work.</span>
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
            <MetricCard icon={Workflow} label="14-day runs" value={compactNumber(summary?.totalRuns ?? 0)} note={`${summary?.activeRuns ?? 0} active`} tone="blue" />
            <MetricCard icon={CircleDollarSign} label="Estimated spend" value={formatUsd(summary?.estimatedCostUsd ?? 0)} note={`${(summary?.costBudgetUtilization ?? 0).toFixed(1)}% of run budgets`} tone="violet" />
            <MetricCard icon={ShieldCheck} label="Successful" value={compactNumber(summary?.successfulRuns ?? 0)} note={`${summary?.budgetStops ?? 0} stops`} tone="emerald" />
            <MetricCard icon={Boxes} label="Active batches" value={compactNumber(totalActiveBatches)} note={`${summary?.pausedRuns ?? 0} paused · ${summary?.failedRuns ?? 0} failed`} tone="amber" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><h3 className="font-semibold text-slate-900">Spend & usage</h3><p className="text-xs text-slate-500">14-day estimated cost and request volume.</p></div>
            <span className="text-[11px] text-slate-400">30s refresh</span>
          </div>
          <div className="h-64 w-full" data-testid="generation-usage-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.dailyUsage ?? []} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })} />
                <YAxis yAxisId="cost" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${compactNumber(Number(value))}`} />
                <YAxis yAxisId="requests" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#cbd5e1", fontSize: 12 }} formatter={(value, name) => name === "Estimated cost" ? [formatUsd(Number(value)), name] : [compactNumber(Number(value)), name]} />
                <Area yAxisId="cost" type="monotone" dataKey="estimatedCostUsd" name="Estimated cost" stroke="#2563eb" strokeWidth={2} fill="url(#costFill)" isAnimationActive={false} />
                <Area yAxisId="requests" type="monotone" dataKey="requests" name="Requests" stroke="#8b5cf6" strokeWidth={2} fill="transparent" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div><h3 className="font-semibold text-slate-900">Outcomes</h3><p className="text-xs text-slate-500">Run states.</p></div>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4"><h3 className="font-semibold text-slate-900">Campaign batch queue</h3><p className="text-xs text-slate-500">Durable child batches across active runs.</p></div>
          <div className="space-y-3" data-testid="generation-batch-queue">
            {activeBatches.length ? activeBatches.map((item) => (
              <div key={item.state} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATE_COLORS[item.state.toLowerCase()] ?? DEFAULT_CHART_COLOR }} />{humanize(item.state)}</span>
                <strong className="tabular-nums text-slate-900">{item.count}</strong>
              </div>
            )) : (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center">
                <Check className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-sm font-medium text-slate-700">No active batches</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4"><h3 className="font-semibold text-slate-900">Stage flow</h3><p className="text-xs text-slate-500">Active stages.</p></div>
          <div className="space-y-3" data-testid="generation-stage-flow">
            {activeStages.length ? activeStages.slice(0, 8).map((item) => (
              <div key={`${item.stage}-${item.state}`} className="grid grid-cols-[minmax(100px,0.8fr)_minmax(120px,1fr)_auto] items-center gap-3 text-xs">
                <span className="truncate font-medium text-slate-700">{humanize(item.stage)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(5, item.count / maxStageCount * 100)}%` }} /></div>
                <span className="min-w-16 text-right tabular-nums text-slate-500">{item.count} · {humanize(item.state)}</span>
              </div>
            )) : (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center">
                <Check className="mb-2 h-5 w-5 text-emerald-600" /><p className="text-sm font-medium text-slate-700">No stage backlog</p>
              </div>
            )}
          </div>
          {activeCheckpoints.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3" data-testid="generation-checkpoint-ledger">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Atomic checkpoint ledger</p>
              <div className="flex flex-wrap gap-2">
                {activeCheckpoints.slice(0, 6).map((item) => (
                  <span key={`${item.node}-${item.state}`} className="text-[11px] text-slate-600">
                    {humanize(item.node)} · {humanize(item.state)} · {item.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4"><h3 className="font-semibold text-slate-900">Safeguards</h3></div>
          <div className="space-y-5">
            <BudgetBar label="Cost budget used" value={summary?.costBudgetUtilization ?? 0} detail={`${(summary?.costBudgetUtilization ?? 0).toFixed(1)}%`} tone={(summary?.costBudgetUtilization ?? 0) > 80 ? "amber" : "blue"} />
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
          <div><h3 className="font-semibold text-slate-900">Recent runs</h3><p className="text-xs text-slate-500">Latest activity.</p></div>
          <span className="text-xs text-slate-500">Updated {formatDate(configuration?.updatedAt)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Campaign / run</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Current checkpoint</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Usage & cost</th><th className="px-4 py-3">Updated</th><th className="px-5 py-3 text-right">Tracking</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.recentRuns ?? []).length ? overview?.recentRuns.map((run) => (
                <Fragment key={run.id}>
                  <tr className="bg-white hover:bg-slate-50/70">
                    <td className="px-5 py-3"><strong className="block max-w-44 truncate text-xs text-slate-900">{run.campaignId}</strong><span className="font-mono text-[10px] text-slate-400">{run.id.slice(0, 12)}{run.configurationVersion ? ` · limits v${run.configurationVersion}` : ""}</span></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATE_COLORS[run.state.toLowerCase()] ?? DEFAULT_CHART_COLOR }} />{humanize(run.state)}</span>
                      {run.pauseRequested ? <span className="ml-1 text-amber-600" title="Pause requested"><PauseCircle className="inline h-4 w-4" /></span> : null}
                      {run.budgetExhausted ? <span className="ml-1 text-red-600" title="Budget exhausted"><XCircle className="inline h-4 w-4" /></span> : null}
                    </td>
                    <td className="px-4 py-3"><span className="block text-xs font-medium text-slate-700">{humanize(run.step || "pending")}</span><span className="block max-w-52 truncate text-[11px] text-slate-500">{run.message || "Waiting for checkpoint update"}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, run.progress))}%` }} /></div><span className="text-xs tabular-nums text-slate-500">{run.progress}%</span></div></td>
                    <td className="px-4 py-3"><span className="block text-xs tabular-nums text-slate-700">{formatUsd(run.usage.estimatedCostUsd ?? 0)} · {compactNumber(run.usage.requests)} req</span><span className="text-[11px] text-slate-500">{compactNumber(run.usage.totalTokens)} tokens · {run.usage.toolCalls} tools</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500"><Clock3 className="mr-1 inline h-3 w-3" />{formatDate(run.updatedAt)}</td>
                    <td className="px-5 py-3 text-right"><Button type="button" variant="outline" size="sm" className="border-slate-300 bg-white text-xs" aria-expanded={selectedRunId === run.id} onClick={() => setSelectedRunId((current) => current === run.id ? null : run.id)}><Eye className="mr-1.5 h-3.5 w-3.5" />{selectedRunId === run.id ? "Close" : "Inspect"}</Button></td>
                  </tr>
                  {selectedRunId === run.id ? (
                    <tr className="bg-slate-50/60">
                      <td colSpan={7} className="px-5 py-4">
                        {runDetailsLoading ? <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-blue-600" />Loading durable run tracking…</div> : null}
                        {!runDetailsLoading && runDetailsError ? <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{runDetailsError}</div> : null}
                        {!runDetailsLoading && !runDetailsError && runDetails?.run.id === run.id ? <RunDetailsPanel details={runDetails} /> : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )) : <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">No runs.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
