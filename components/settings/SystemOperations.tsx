"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  FileSearch,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  TerminalSquare,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  buildSystemOperationLogStreamUrl,
  fetchSystemOperationLog,
  fetchSystemOperationRecoveryGuide,
  getAuthHeader,
  listSystemOperationIncidents,
  listSystemOperationLogServices,
  runSystemOperationRecoveryAction,
  type SystemOperationIncident,
  type SystemOperationLogService,
  type SystemOperationRecoveryActionResponse,
  type SystemOperationRecoveryGuideItem,
} from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";
import {
  SYSTEM_OPERATION_SERVICES,
  actionDetails,
  countAvailableLogs,
  countCampaigns,
  countLockedWorkflows,
  countSafeChecks,
  filterLogLines,
  formatRelativeTime,
  humanizePipeline,
  incidentExplanation,
  incidentsByPipeline,
  logLineLevel,
  progressPercentage,
  type LogFilter,
} from "@/lib/systemOperations";

const MAX_LOG_LINES = 1000;
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  color: "var(--foreground)",
  fontSize: 12,
};

type PendingRecoveryAction = {
  incident: SystemOperationIncident;
  action: string;
  dryRun: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

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

function Metric({
  label,
  value,
  note,
  tone = "blue",
  children,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "blue" | "amber" | "green";
  children: ReactNode;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {children}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </Card>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}

function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span>{message} Existing values are not presented as current.</span>
      <Button
        type="button"
        variant="outline"
        onClick={retry}
        className="h-8 shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
      >
        Try again
      </Button>
    </div>
  );
}

function IncidentCard({
  incident,
  expanded,
  onToggle,
  onAction,
}: {
  incident: SystemOperationIncident;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, dryRun: boolean) => void;
}) {
  const explanation = incidentExplanation(incident.code);
  const progress = progressPercentage(incident.doneTotal, incident.targetTotal);
  const firstAction = incident.recommendedActions[0];

  return (
    <Card
      className="gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-sm"
      style={{ contentVisibility: "auto", containIntrinsicSize: "380px" }}
    >
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 shadow-none">
                Needs attention
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {humanizePipeline(incident.pipeline)} team
              </span>
              <span aria-hidden="true" className="text-muted-foreground/50">
                ·
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(incident.updatedAt)}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              {explanation.title}
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {explanation.impact}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {firstAction ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onAction(firstAction, true)}
                className="h-9 border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <FileSearch className="mr-1.5 h-3.5 w-3.5" />
                Run safe check
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={onToggle}
              aria-expanded={expanded}
              className="h-9 border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              {expanded ? "Hide details" : "Review recovery"}
              {expanded ? (
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-foreground">
                Campaign progress
              </span>
              <span className="tabular-nums text-muted-foreground">
                {incident.doneTotal.toLocaleString()} of{" "}
                {incident.targetTotal.toLocaleString()}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Campaign progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress ?? undefined}
              aria-valuetext={
                progress == null ? "Target unavailable" : `${progress}%`
              }
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-amber-600" />
              {incident.locks.contentInProgress ||
              incident.locks.batchInProgress
                ? "Active hold detected"
                : "No active hold"}
            </span>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border/60 bg-muted/20 p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended path
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {explanation.next}
              </p>
              <div className="mt-4 space-y-3">
                {incident.recommendedActions.length ? (
                  incident.recommendedActions.map((action, index) => {
                    const details = actionDetails(action);
                    return (
                      <div
                        key={action}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {details.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {details.detail}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => onAction(action, true)}
                                className="h-8 border-border bg-background px-3 text-xs text-foreground hover:bg-muted"
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />{" "}
                                Check safely
                              </Button>
                              <Button
                                type="button"
                                onClick={() => onAction(action, false)}
                                className="btn-sidebar-noise h-8 px-3 text-xs"
                              >
                                <Wrench className="mr-1.5 h-3.5 w-3.5" /> Apply
                                step
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    No automated recovery step is recommended. Inspect the
                    service logs.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Campaign details
              </p>
              <dl className="mt-3 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Campaign ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-foreground">
                    {incident.campaignId}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Campaign state
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {incident.campaignStatus || "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Progress state
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {incident.progressStatus || "Unavailable"}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Event</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {incident.eventCode || "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Last recorded update
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatDateTime(incident.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Technical signal
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-foreground">
                    {incident.code}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default function SystemOperationsPage() {
  const { isSuperAdmin } = useAuth();
  const [services, setServices] = useState<SystemOperationLogService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [logSource, setLogSource] = useState<"docker" | "file">("docker");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logPath, setLogPath] = useState("");
  const [logExists, setLogExists] = useState<boolean | null>(null);
  const [logContainerName, setLogContainerName] = useState<string | null>(null);
  const [logContainerStatus, setLogContainerStatus] = useState<string | null>(
    null,
  );
  const [dockerLogsEnabled, setDockerLogsEnabled] = useState<boolean | null>(
    null,
  );
  const [dockerLogsDisabledReason, setDockerLogsDisabledReason] = useState<
    string | null
  >(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<SystemOperationIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [guideItems, setGuideItems] = useState<
    SystemOperationRecoveryGuideItem[]
  >([]);
  const [guideLoading, setGuideLoading] = useState(true);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingRecoveryAction | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [lastResult, setLastResult] =
    useState<SystemOperationRecoveryActionResponse | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const terminalRef = useRef<HTMLPreElement | null>(null);

  const serviceStatus = useMemo(() => {
    const map = new Map<string, SystemOperationLogService>();
    services.forEach((service) => map.set(service.service, service));
    return map;
  }, [services]);
  const filteredIncidents = useMemo(
    () =>
      pipelineFilter === "all"
        ? incidents
        : incidents.filter(
            (incident) => incident.pipeline.toLowerCase() === pipelineFilter,
          ),
    [incidents, pipelineFilter],
  );
  const chartData = useMemo(() => incidentsByPipeline(incidents), [incidents]);
  const visibleLogLines = useMemo(
    () => filterLogLines(logLines, logFilter),
    [logFilter, logLines],
  );
  const logCounts = useMemo(
    () => ({
      warning: logLines.filter((line) => logLineLevel(line) === "warning")
        .length,
      error: logLines.filter((line) => logLineLevel(line) === "error").length,
    }),
    [logLines],
  );

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const dockerData = await listSystemOperationLogServices("docker");
      const dockerAvailable =
        dockerData.enabled !== false &&
        dockerData.available !== false &&
        !dockerData.error;
      if (dockerAvailable) {
        setLogSource("docker");
        setDockerLogsEnabled(true);
        setDockerLogsDisabledReason(null);
        setServices(
          Array.isArray(dockerData.services) ? dockerData.services : [],
        );
      } else {
        const fileData = await listSystemOperationLogServices("file");
        const dockerLogsIntentionallyDisabled = dockerData.enabled === false;
        setLogSource("file");
        setDockerLogsEnabled(true);
        setDockerLogsDisabledReason(
          dockerLogsIntentionallyDisabled
            ? null
            : `${
                dockerData.reason ||
                "Docker service logs are unavailable. Start the Docker engine and try again."
              } Showing application file logs instead.`,
        );
        setServices(Array.isArray(fileData.services) ? fileData.services : []);
      }
    } catch (error: unknown) {
      setServicesError(getErrorMessage(error));
      setDockerLogsEnabled(false);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    setIncidentsError(null);
    try {
      const data = await listSystemOperationIncidents(100);
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
    } catch (error: unknown) {
      setIncidentsError(getErrorMessage(error));
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  const loadGuide = useCallback(async () => {
    setGuideLoading(true);
    setGuideError(null);
    try {
      const data = await fetchSystemOperationRecoveryGuide();
      setGuideItems(Array.isArray(data.items) ? data.items : []);
    } catch (error: unknown) {
      setGuideError(getErrorMessage(error));
      setGuideItems([]);
    } finally {
      setGuideLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true);
    await Promise.allSettled([loadServices(), loadIncidents(), loadGuide()]);
    setRefreshingAll(false);
  }, [loadGuide, loadIncidents, loadServices]);

  const loadInitialLog = useCallback(
    async (service: string) => {
      setLogsLoading(true);
      setLogsError(null);
      setLogLines([]);
      try {
        const data = await fetchSystemOperationLog(service, {
          tail: 200,
          source: logSource,
        });
        if (data.enabled === false || data.available === false) {
          setDockerLogsEnabled(false);
          setDockerLogsDisabledReason(
            data.reason ||
              "Docker service logs are unavailable. Start the Docker engine and try again.",
          );
          setLogPath("");
          setLogContainerName(null);
          setLogContainerStatus(null);
          setLogExists(false);
          return;
        }
        setDockerLogsEnabled(true);
        setDockerLogsDisabledReason(null);
        setLogPath(data.path || "");
        setLogContainerName(data.containerName || null);
        setLogContainerStatus(data.status || null);
        setLogExists(Boolean(data.exists));
        setLogLines(
          Array.isArray(data.lines) ? data.lines.slice(-MAX_LOG_LINES) : [],
        );
      } catch (error: unknown) {
        setLogsError(getErrorMessage(error));
        setLogLines([]);
      } finally {
        setLogsLoading(false);
      }
    },
    [logSource],
  );

  const startLogStream = useCallback(
    async (service: string) => {
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      try {
        const response = await fetch(
          buildSystemOperationLogStreamUrl(service, 1, logSource),
          {
            headers: { ...getAuthHeader(), ...getLocalDevNgrokHeaders() },
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(response.statusText || "Live log connection failed");
        if (!response.body) throw new Error("Live logs are unavailable");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const eventText of events) {
            const eventLine = eventText
              .split("\n")
              .find((line) => line.startsWith("event:"));
            const dataLine = eventText
              .split("\n")
              .find((line) => line.startsWith("data:"));
            const eventName =
              eventLine?.replace(/^event:\s*/, "").trim() || "message";
            const rawData = dataLine?.replace(/^data:\s*/, "").trim();
            if (!rawData) continue;
            const payload = JSON.parse(rawData) as {
              line?: string;
              reason?: string;
              service?: string;
              containerName?: string;
              status?: string;
            };
            if (eventName === "unavailable") {
              setDockerLogsEnabled(false);
              setDockerLogsDisabledReason(
                payload.reason || "Docker log access is disabled.",
              );
            } else if (eventName === "missing") {
              setLogExists(false);
              setLogsError(
                logSource === "docker"
                  ? `No Docker container was found for ${payload.service || service}.`
                  : `No application log file was found for ${payload.service || service}.`,
              );
            } else if (eventName === "log" && payload.line) {
              setLogExists(true);
              if (payload.containerName)
                setLogContainerName(payload.containerName);
              if (payload.status) setLogContainerStatus(payload.status);
              setLogLines((previous) =>
                previous.at(-1) === payload.line
                  ? previous
                  : [...previous, payload.line as string].slice(-MAX_LOG_LINES),
              );
            }
          }
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) setLogsError(getErrorMessage(error));
      }
    },
    [logSource],
  );

  const openService = (service: string) => {
    setSelectedService(service);
    setLogsPaused(false);
    setLogsError(null);
    setLogFilter("all");
  };

  const closeLogs = () => {
    streamAbortRef.current?.abort();
    setSelectedService(null);
    setLogLines([]);
    setLogPath("");
    setLogExists(null);
    setLogContainerName(null);
    setLogContainerStatus(null);
    setLogsError(null);
    setLogFilter("all");
  };

  const openActionConfirm = (
    incident: SystemOperationIncident,
    action: string,
    dryRun: boolean,
  ) => {
    setPendingAction({ incident, action, dryRun });
    setReason(dryRun ? "Checking the recommended recovery step" : "");
    setAcknowledged(false);
  };

  const closeActionConfirm = () => {
    if (actionSaving) return;
    setPendingAction(null);
    setReason("");
    setAcknowledged(false);
  };

  const confirmRecoveryAction = async () => {
    if (!pendingAction) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Add an admin reason before continuing");
      return;
    }
    if (!pendingAction.dryRun && !acknowledged) return;

    setActionSaving(true);
    try {
      const response = await runSystemOperationRecoveryAction(
        pendingAction.incident.campaignId,
        pendingAction.action,
        { reason: trimmedReason, dryRun: pendingAction.dryRun },
      );
      setLastResult(response);
      toast.success(
        pendingAction.dryRun
          ? "Safe check completed — no changes were made"
          : "Recovery request accepted",
      );
      setPendingAction(null);
      setReason("");
      setAcknowledged(false);
      await loadIncidents();
    } catch (error: unknown) {
      toast.error("Recovery action failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setActionSaving(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    void refreshAll();
  }, [isSuperAdmin, refreshAll]);

  useEffect(() => {
    if (selectedService) void loadInitialLog(selectedService);
  }, [loadInitialLog, selectedService]);

  useEffect(() => {
    if (!selectedService || logsPaused || dockerLogsEnabled === false) return;
    void startLogStream(selectedService);
    return () => streamAbortRef.current?.abort();
  }, [dockerLogsEnabled, logsPaused, selectedService, startLogStream]);

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!terminalRef.current || logsPaused) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logLines, logsPaused]);

  const modalOpen = Boolean(pendingAction);
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !actionSaving) {
        setPendingAction(null);
        setReason("");
        setAcknowledged(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actionSaving, modalOpen]);

  if (!isSuperAdmin) {
    return (
      <div className="admin-page flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
        <Card className="admin-card max-w-md p-6 text-center">
          <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">
            Super Admin Only
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            System Operations is restricted to super admin users.
          </p>
        </Card>
      </div>
    );
  }

  const attentionValue =
    incidentsLoading && !incidents.length
      ? "—"
      : incidentsError
        ? "—"
        : countCampaigns(incidents).toLocaleString();
  const locksValue =
    incidentsLoading && !incidents.length
      ? "—"
      : incidentsError
        ? "—"
        : countLockedWorkflows(incidents).toLocaleString();
  const checksValue =
    incidentsLoading && !incidents.length
      ? "—"
      : incidentsError
        ? "—"
        : countSafeChecks(incidents).toLocaleString();
  const logsValue =
    servicesLoading && !services.length
      ? "—"
      : servicesError
        ? "—"
        : `${countAvailableLogs(services)}/${SYSTEM_OPERATION_SERVICES.length}`;

  return (
    <div className="admin-page flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent">
      <div className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <SettingsBackButton href="/settings" />
          <h1 className="admin-title">Operations Center</h1>
          <p className="admin-description">
            See what needs attention, safely check the cause, and recover one
            campaign at a time.
          </p>
        </div>
        <div className="admin-actions">
          <Button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshingAll}
            className="analytics-frost-btn h-10 px-4"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshingAll ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Campaigns needing attention"
            value={attentionValue}
            note="Unique running campaigns with stalled progress or an old hold."
            tone={
              attentionValue === "—"
                ? "blue"
                : attentionValue === "0"
                  ? "green"
                  : "amber"
            }
          >
            <AlertTriangle className="h-4 w-4" />
          </Metric>
          <Metric
            label="Active workflow holds"
            value={locksValue}
            note="Content or validation holds detected across those campaigns."
            tone={
              locksValue === "—"
                ? "blue"
                : locksValue === "0"
                  ? "green"
                  : "amber"
            }
          >
            <LockKeyhole className="h-4 w-4" />
          </Metric>
          <Metric
            label="Safe checks available"
            value={checksValue}
            note="Read-only checks you can run before making a recovery change."
          >
            <FileSearch className="h-4 w-4" />
          </Metric>
          <Metric
            label="Log sources ready"
            value={logsValue}
            note="Containers with logs available. This is not a health measurement."
            tone={logsValue.startsWith("7/") ? "green" : "blue"}
          >
            <Server className="h-4 w-4" />
          </Metric>
        </div>

        {lastResult ? (
          <Card className="gap-0 rounded-2xl border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {lastResult.status === "dry_run"
                      ? "Safe check completed — no changes were made"
                      : "Recovery request accepted"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    {actionDetails(lastResult.action).label} ·{" "}
                    {humanizePipeline(lastResult.pipeline)} team
                  </p>
                  <details className="mt-2 text-xs text-emerald-900">
                    <summary className="cursor-pointer font-medium">
                      View result details
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-mono text-[11px]">
                      {JSON.stringify(
                        {
                          campaignId: lastResult.campaignId,
                          changed: lastResult.changed,
                          before: lastResult.before,
                          after: lastResult.after,
                          task: lastResult.task,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLastResult(null)}
                className="h-8 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <Panel
            title="Where attention is needed"
            detail="Unique affected campaigns by team. Select a team to focus the action list."
          >
            {incidentsError ? (
              <ErrorNotice
                message={incidentsError}
                retry={() => void loadIncidents()}
              />
            ) : incidentsLoading && !incidents.length ? (
              <Empty>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                campaign signals…
              </Empty>
            ) : countCampaigns(incidents) === 0 ? (
              <Empty>
                <span>
                  <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
                  No stalled campaigns were detected.
                </span>
              </Empty>
            ) : (
              <>
                <div className="h-52" aria-label="Affected campaigns by team">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={72}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: "var(--muted)" }}
                      />
                      <Bar
                        dataKey="campaigns"
                        name="Campaigns"
                        fill="#2563eb"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Filter campaigns by team"
                >
                  {["all", "sales", "delegate", "production"].map(
                    (pipeline) => (
                      <Button
                        key={pipeline}
                        type="button"
                        variant="outline"
                        onClick={() => setPipelineFilter(pipeline)}
                        aria-pressed={pipelineFilter === pipeline}
                        className={`h-8 px-3 text-xs ${
                          pipelineFilter === pipeline
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {pipeline === "all"
                          ? "All teams"
                          : humanizePipeline(pipeline)}
                      </Button>
                    ),
                  )}
                </div>
              </>
            )}
          </Panel>

          <Panel
            title="Recommended actions"
            detail="Safe checks are read-only. Recovery steps stay hidden until you review a campaign."
            control={
              !incidentsLoading && !incidentsError ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {filteredIncidents.length} signal
                  {filteredIncidents.length === 1 ? "" : "s"}
                </span>
              ) : undefined
            }
          >
            {incidentsError ? (
              <ErrorNotice
                message={incidentsError}
                retry={() => void loadIncidents()}
              />
            ) : incidentsLoading && !incidents.length ? (
              <Empty>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing
                recommendations…
              </Empty>
            ) : filteredIncidents.length === 0 ? (
              <Empty>No campaigns need recovery for this team.</Empty>
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((incident) => {
                  const id = `${incident.campaignId}:${incident.code}`;
                  return (
                    <IncidentCard
                      key={id}
                      incident={incident}
                      expanded={expandedIncident === id}
                      onToggle={() =>
                        setExpandedIncident((current) =>
                          current === id ? null : id,
                        )
                      }
                      onAction={(action, dryRun) =>
                        openActionConfirm(incident, action, dryRun)
                      }
                    />
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title="Advanced service logs"
          detail="Use logs when a safe check needs more context. A ready log source does not prove that a service is healthy."
          control={
            selectedService ? (
              <Button
                type="button"
                variant="outline"
                onClick={closeLogs}
                className="h-8 border-border bg-background px-3 text-xs text-foreground hover:bg-muted"
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Close logs
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {servicesError ? (
              <ErrorNotice
                message={servicesError}
                retry={() => void loadServices()}
              />
            ) : null}
            {dockerLogsDisabledReason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                {dockerLogsDisabledReason ||
                  "Docker log access is disabled for this environment."}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {SYSTEM_OPERATION_SERVICES.map((meta) => {
                const status = serviceStatus.get(meta.key);
                const active = selectedService === meta.key;
                const running = status?.status?.toLowerCase() === "running";
                const label = servicesLoading
                  ? "Checking"
                  : running
                    ? "Running · logs ready"
                    : status?.exists
                      ? status.status || "Logs ready"
                      : "Logs unavailable";
                return (
                  <button
                    key={meta.key}
                    type="button"
                    disabled={servicesLoading || dockerLogsEnabled === false}
                    onClick={() => openService(meta.key)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border-blue-300 bg-blue-50"
                        : "border-border bg-background hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Server
                        className={`h-4 w-4 ${active ? "text-blue-600" : "text-muted-foreground"}`}
                      />
                      <span
                        className={`h-2 w-2 rounded-full ${
                          running
                            ? "bg-emerald-500"
                            : status?.exists
                              ? "bg-blue-500"
                              : "bg-zinc-300"
                        }`}
                      />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {meta.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {meta.detail}
                    </p>
                    <p
                      className={`mt-3 text-[11px] font-medium ${
                        running
                          ? "text-emerald-700"
                          : active
                            ? "text-blue-700"
                            : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>

            {!selectedService ? (
              <Empty>Select a service to open its live technical log.</Empty>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d1117] text-zinc-100 shadow-[0_20px_40px_-28px_rgba(2,10,27,0.9)]">
                <div className="flex flex-col gap-3 border-b border-white/10 bg-[#161b22] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TerminalSquare className="h-4 w-4 text-blue-400" />
                      <p className="text-sm font-semibold">
                        {logContainerName ||
                          SYSTEM_OPERATION_SERVICES.find(
                            (service) => service.key === selectedService,
                          )?.name ||
                          selectedService}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
                        {logContainerStatus ||
                          (logExists
                            ? logSource === "file"
                              ? "file log"
                              : "available"
                            : "unavailable")}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {logsPaused ? "Paused" : "Live"}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate text-[11px] text-zinc-500"
                      title={logPath}
                    >
                      {selectedService}
                      {logPath ? ` · ${logPath}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "warning", "error"] as LogFilter[]).map(
                      (filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setLogFilter(filter)}
                          aria-pressed={logFilter === filter}
                          className={`h-8 rounded-md border px-2.5 text-xs ${
                            logFilter === filter
                              ? "border-blue-400/50 bg-blue-500/20 text-blue-100"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          {filter === "all"
                            ? `All ${logLines.length}`
                            : filter === "warning"
                              ? `Warnings ${logCounts.warning}`
                              : `Errors ${logCounts.error}`}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setLogsPaused((current) => !current)}
                      className="flex h-8 items-center rounded-md border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:bg-white/10"
                    >
                      {logsPaused ? (
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <Pause className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {logsPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogLines([])}
                      className="flex h-8 items-center rounded-md border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:bg-white/10"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear screen
                    </button>
                  </div>
                </div>
                {logsError ? (
                  <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-xs text-red-200">
                    {logsError}
                  </div>
                ) : null}
                <pre
                  ref={terminalRef}
                  className="scrollbar-modern h-[min(32rem,56dvh)] overflow-auto whitespace-pre-wrap bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-zinc-200"
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "500px",
                  }}
                >
                  {logsLoading
                    ? "Loading logs…"
                    : visibleLogLines.length
                      ? visibleLogLines.join("\n")
                      : logLines.length
                        ? `No ${logFilter} lines in the current view.`
                        : "No log lines are available."}
                </pre>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Recovery playbook"
          detail="Plain-language guidance for common operational signals. Open only the item you need."
        >
          {guideError ? (
            <ErrorNotice message={guideError} retry={() => void loadGuide()} />
          ) : guideLoading ? (
            <Empty>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recovery
              guidance…
            </Empty>
          ) : guideItems.length === 0 ? (
            <Empty>No recovery guidance is available.</Empty>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {guideItems.map((item) => {
                const open = expandedGuide === item.code;
                const affected = incidents.filter(
                  (incident) => incident.code === item.code,
                ).length;
                return (
                  <div
                    key={item.code}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGuide(open ? null : item.code)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <CircleGauge className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {affected
                              ? `${affected} current signal${affected === 1 ? "" : "s"}`
                              : "Reference guide"}
                          </span>
                        </span>
                      </span>
                      {open ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {open ? (
                      <div className="border-t border-border bg-muted/20 px-4 py-4">
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.resolution}
                        </p>
                        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                          Signal: {item.code}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-blue-900">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          Recovery actions are never automatic. Safe checks make no changes;
          every applied step is campaign-scoped, requires an admin reason, and
          is recorded by the backend.
        </div>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close recovery confirmation"
            className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]"
            onClick={closeActionConfirm}
          />
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-dialog-title"
            className="admin-modal-panel relative z-[1] w-full max-w-lg gap-0 overflow-hidden rounded-2xl border border-zinc-300 bg-white p-0"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    pendingAction.dryRun
                      ? "border border-blue-200 bg-blue-50 text-blue-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {pendingAction.dryRun ? (
                    <FileSearch className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {pendingAction.dryRun
                      ? "Read-only safe check"
                      : "Confirm recovery change"}
                  </p>
                  <h2
                    id="recovery-dialog-title"
                    className="mt-1 text-lg font-semibold text-zinc-900"
                  >
                    {actionDetails(pendingAction.action).label}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {humanizePipeline(pendingAction.incident.pipeline)} team ·
                    one campaign
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div
                className={`rounded-xl border p-4 text-sm leading-6 ${
                  pendingAction.dryRun
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {pendingAction.dryRun
                  ? "This check compares the current campaign state without changing data or starting work."
                  : "This applies one recovery step to the campaign below. It does not expose SQL, Docker, restart, delete, or cleanup controls."}
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Campaign ID</p>
                <p className="mt-1 break-all font-mono text-xs text-zinc-800">
                  {pendingAction.incident.campaignId}
                </p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Admin reason
                </span>
                <Textarea
                  autoFocus
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    pendingAction.dryRun
                      ? "Why are you checking this campaign?"
                      : "Why is this recovery needed?"
                  }
                  className="min-h-24 border-zinc-300 bg-white"
                />
              </label>
              {!pendingAction.dryRun ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-blue-600"
                  />
                  <span>
                    I understand this changes only this campaign and that I
                    should run the safe check first.
                  </span>
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={actionSaving}
                onClick={closeActionConfirm}
                className="h-9 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  actionSaving ||
                  !reason.trim() ||
                  (!pendingAction.dryRun && !acknowledged)
                }
                onClick={() => void confirmRecoveryAction()}
                className={
                  pendingAction.dryRun
                    ? "h-9 border border-blue-200 bg-blue-50 px-4 text-blue-700 hover:bg-blue-100"
                    : "btn-sidebar-noise h-9 px-4"
                }
              >
                {actionSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : pendingAction.dryRun ? (
                  <FileSearch className="mr-2 h-4 w-4" />
                ) : (
                  <Wrench className="mr-2 h-4 w-4" />
                )}
                {pendingAction.dryRun
                  ? "Run safe check"
                  : "Apply recovery step"}
                {!actionSaving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
