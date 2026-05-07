"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TerminalSquare,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSystemOperationLog,
  fetchSystemOperationRecoveryGuide,
  buildSystemOperationDockerLogStreamUrl,
  getAuthHeader,
  listSystemOperationIncidents,
  listSystemOperationLogServices,
  runSystemOperationRecoveryAction,
  type SystemOperationIncident,
  type SystemOperationLogService,
  type SystemOperationRecoveryGuideItem,
} from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

const LOG_SERVICES = ["api", "worker", "delegate_worker", "production_worker", "send_worker", "auth_worker", "beat"];
const MAX_LOG_LINES = 1000;

const ACTION_LABELS: Record<string, string> = {
  "unlock-content": "Unlock Content Generation",
  "trigger-content-catchup": "Continue Content Generation",
  "unlock-profile-batch": "Unlock Profile Validation",
  "trigger-profile-dispatcher": "Continue Profile Validation",
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
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function statusTone(value?: string | null) {
  const status = String(value || "").toLowerCase();
  if (status === "ok" || status === "active" || status === "running" || status === "available") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "warning" || status === "dry_run") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "critical" || status === "failed" || status === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusBadge({ value }: { value?: string | null }) {
  return (
    <Badge className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-none ${statusTone(value)}`}>
      {value || "unknown"}
    </Badge>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

function LocksSummary({ incident }: { incident: SystemOperationIncident }) {
  const locks = [
    { label: "Content", value: incident.locks.contentInProgress, at: incident.locks.contentStartedAt },
    { label: "Batch", value: incident.locks.batchInProgress, at: incident.locks.batchHeartbeatAt || incident.locks.batchStartedAt },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {locks.map((lock) => (
        <div key={lock.label} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{lock.label} Lock</p>
          <p className={`mt-1 text-sm font-semibold ${lock.value ? "text-amber-700" : "text-emerald-700"}`}>
            {lock.value ? "Locked" : "Clear"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(lock.at)}</p>
        </div>
      ))}
    </div>
  );
}

export default function SystemOperationsPage() {
  const { isSuperAdmin } = useAuth();
  const [services, setServices] = useState<SystemOperationLogService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logPath, setLogPath] = useState("");
  const [logExists, setLogExists] = useState<boolean | null>(null);
  const [logContainerName, setLogContainerName] = useState<string | null>(null);
  const [logContainerStatus, setLogContainerStatus] = useState<string | null>(null);
  const [dockerLogsEnabled, setDockerLogsEnabled] = useState<boolean | null>(null);
  const [dockerLogsDisabledReason, setDockerLogsDisabledReason] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<SystemOperationIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [guideItems, setGuideItems] = useState<SystemOperationRecoveryGuideItem[]>([]);
  const [guideLoading, setGuideLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingRecoveryAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const cursorRef = useRef(0);
  const streamAbortRef = useRef<AbortController | null>(null);
  const terminalRef = useRef<HTMLPreElement | null>(null);

  const serviceStatus = useMemo(() => {
    const map = new Map<string, SystemOperationLogService>();
    services.forEach((service) => map.set(service.service, service));
    return map;
  }, [services]);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const data = await listSystemOperationLogServices();
      setDockerLogsEnabled(data.enabled !== false);
      setDockerLogsDisabledReason(data.enabled === false ? data.reason || "docker logs source is disabled" : null);
      setServices(Array.isArray(data.services) ? data.services : []);
    } catch (error: unknown) {
      toast.error("Failed to load log services", { description: getErrorMessage(error) });
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    try {
      const data = await listSystemOperationIncidents(100);
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
    } catch (error: unknown) {
      toast.error("Failed to load incidents", { description: getErrorMessage(error) });
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  const loadGuide = useCallback(async () => {
    setGuideLoading(true);
    try {
      const data = await fetchSystemOperationRecoveryGuide();
      setGuideItems(Array.isArray(data.items) ? data.items : []);
    } catch (error: unknown) {
      toast.error("Failed to load recovery guide", { description: getErrorMessage(error) });
      setGuideItems([]);
    } finally {
      setGuideLoading(false);
    }
  }, []);

  const loadInitialLog = useCallback(async (service: string) => {
    setLogsLoading(true);
    setLogsError(null);
    setLogLines([]);
    try {
      const data = await fetchSystemOperationLog(service, { tail: 200 });
      if (data.enabled === false) {
        setDockerLogsEnabled(false);
        setDockerLogsDisabledReason("Docker log source is disabled. Ask admin to enable docker-compose.docker-logs.yml.");
        setLogLines([]);
        setLogPath("");
        setLogContainerName(null);
        setLogContainerStatus(null);
        setLogExists(false);
        return;
      }
      setDockerLogsEnabled(true);
      setDockerLogsDisabledReason(null);
      cursorRef.current = Number(data.cursor || 0);
      setLogPath(data.path || "");
      setLogContainerName(data.containerName || null);
      setLogContainerStatus(data.status || null);
      setLogExists(Boolean(data.exists));
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setLogsError(message);
      setLogLines([]);
      toast.error("Failed to load logs", { description: message });
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const startDockerLogStream = useCallback(async (service: string) => {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    try {
      const response = await fetch(buildSystemOperationDockerLogStreamUrl(service, 200), {
        headers: {
          ...getAuthHeader(),
          ...getLocalDevNgrokHeaders(),
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.statusText || "Docker log stream failed");
      if (!response.body) throw new Error("Docker log stream is unavailable");

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
          const eventLine = eventText.split("\n").find((line) => line.startsWith("event:"));
          const dataLine = eventText.split("\n").find((line) => line.startsWith("data:"));
          const eventName = eventLine?.replace(/^event:\s*/, "").trim() || "message";
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
            setDockerLogsDisabledReason("Docker log source is disabled. Ask admin to enable docker-compose.docker-logs.yml.");
            continue;
          }
          if (eventName === "missing") {
            setLogExists(false);
            setLogsError(`No Docker container found for ${payload.service || service}.`);
            continue;
          }
          if (eventName === "log" && payload.line) {
            setLogExists(true);
            if (payload.containerName) setLogContainerName(payload.containerName);
            if (payload.status) setLogContainerStatus(payload.status);
            setLogLines((prev) => [...prev, payload.line as string].slice(-MAX_LOG_LINES));
          }
        }
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) setLogsError(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadServices();
    void loadIncidents();
    void loadGuide();
  }, [isSuperAdmin, loadGuide, loadIncidents, loadServices]);

  useEffect(() => {
    if (!selectedService) {
      cursorRef.current = 0;
      return;
    }
    void loadInitialLog(selectedService);
  }, [loadInitialLog, selectedService]);

  useEffect(() => {
    if (!selectedService || logsPaused || dockerLogsEnabled === false) return;
    void startDockerLogStream(selectedService);
    return () => {
      streamAbortRef.current?.abort();
    };
  }, [dockerLogsEnabled, logsPaused, selectedService, startDockerLogStream]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current || logsPaused) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logLines, logsPaused]);

  const openService = (service: string) => {
    setSelectedService(service);
    setLogsPaused(false);
    setLogsError(null);
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
    cursorRef.current = 0;
  };

  const clearScreen = () => {
    setLogLines([]);
  };

  const openActionConfirm = (incident: SystemOperationIncident, action: string, dryRun: boolean) => {
    setPendingAction({ incident, action, dryRun });
    setReason(dryRun ? "checking recovery" : "");
  };

  const closeActionConfirm = () => {
    if (actionSaving) return;
    setPendingAction(null);
    setReason("");
  };

  const confirmRecoveryAction = async () => {
    if (!pendingAction) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Reason is required");
      return;
    }

    setActionSaving(true);
    try {
      const response = await runSystemOperationRecoveryAction(
        pendingAction.incident.campaignId,
        pendingAction.action,
        { reason: trimmedReason, dryRun: pendingAction.dryRun }
      );
      toast.success(pendingAction.dryRun ? "Dry run completed" : "Recovery action accepted", {
        description: `${actionLabel(response.action)} for ${response.campaignId}`,
      });
      closeActionConfirm();
      await loadIncidents();
    } catch (error: unknown) {
      toast.error("Recovery action failed", { description: getErrorMessage(error) });
    } finally {
      setActionSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
        <Card className="max-w-md rounded-2xl border border-zinc-200 bg-white/88 p-6 text-center">
          <ShieldAlert className="mx-auto h-9 w-9 text-amber-600" />
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">Super Admin Only</h1>
          <p className="mt-2 text-sm text-zinc-500">System Operations is restricted to super admin users.</p>
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
          <p className="text-lg font-normal text-zinc-900">Admin Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">System Operations</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Read live service logs and run confirmed, campaign-scoped recovery actions. No SQL, Docker, restart, or delete controls are exposed here.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            void loadServices();
            void loadIncidents();
            void loadGuide();
          }}
          className="analytics-frost-btn h-10 px-4"
          disabled={servicesLoading || incidentsLoading || guideLoading}
        >
          <RefreshCw className={`h-4 w-4 ${servicesLoading || incidentsLoading || guideLoading ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </motion.div>

      <div className="space-y-5">
        <SectionCard title="Live Logs" description="Docker stdout/stderr logs are loaded when a service tab opens. Streaming stops when the log tab is closed or paused.">
          <div className="space-y-4 p-5">
            {dockerLogsEnabled === false ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                {dockerLogsDisabledReason || "Docker log source is disabled. Ask admin to enable docker-compose.docker-logs.yml."}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {LOG_SERVICES.map((service) => {
                const status = serviceStatus.get(service);
                const isActive = selectedService === service;
                return (
                  <Button
                    key={service}
                    type="button"
                    variant="outline"
                    disabled={dockerLogsEnabled === false}
                    onClick={() => openService(service)}
                    className={`h-9 border-zinc-200 px-3 text-xs font-semibold ${
                      isActive ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {service}
                    {status?.exists ? <CheckCircle2 className="ml-1 h-3.5 w-3.5" /> : null}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Service Selector
                <select
                  value={selectedService || ""}
                  onChange={(event) => {
                    if (event.target.value) openService(event.target.value);
                    else closeLogs();
                  }}
                  disabled={dockerLogsEnabled === false}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-zinc-800 outline-none focus:border-zinc-400"
                >
                  <option value="">Select service</option>
                  {LOG_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectedService && void loadInitialLog(selectedService)}
                  disabled={!selectedService || logsLoading || dockerLogsEnabled === false}
                  className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogsPaused((prev) => !prev)}
                  disabled={!selectedService || dockerLogsEnabled === false}
                  className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                >
                  {logsPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                  {logsPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearScreen}
                  disabled={!selectedService}
                  className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeLogs}
                  disabled={!selectedService}
                  className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            {selectedService ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d1117] text-zinc-100 shadow-[0_20px_40px_-28px_rgba(2,10,27,0.9)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#161b22] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{logContainerName || selectedService}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                        {selectedService}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-400">
                      Docker container logs {logPath ? `- ${logPath}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <StatusBadge value={logContainerStatus || (logExists ? "available" : "missing")} />
                    <span>{logsPaused ? "Paused" : "Streaming"}</span>
                  </div>
                </div>
                {logsError ? <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-xs text-red-200">{logsError}</div> : null}
                <pre ref={terminalRef} className="scrollbar-modern h-[28rem] overflow-auto whitespace-pre-wrap bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-zinc-200">
                  {logsLoading ? "Loading logs..." : logLines.length > 0 ? logLines.join("\n") : "No log lines loaded."}
                </pre>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-8 text-center text-sm text-zinc-500">
                Select a service tab to open the log window.
              </div>
            )}

            {services.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Container</th>
                      <th className="px-4 py-3">Modified</th>
                      <th className="px-4 py-3">Path / ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {services.map((service) => (
                      <tr key={service.service} className="hover:bg-zinc-50/80">
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{service.service}</td>
                        <td className="px-4 py-3"><StatusBadge value={service.status || (service.exists ? "available" : "missing")} /></td>
                        <td className="px-4 py-3 text-sm text-zinc-700">{service.containerName || formatBytes(service.sizeBytes)}</td>
                        <td className="px-4 py-3 text-sm text-zinc-500">{formatDateTime(service.modifiedAt)}</td>
                        <td className="max-w-[28rem] truncate px-4 py-3 font-mono text-xs text-zinc-500" title={service.path || service.containerId || ""}>{service.path || service.containerId || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Incident Recovery" description="Run only explicit, confirmed recovery actions for stale campaign progress.">
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                {incidentsLoading ? "Loading incidents..." : `${incidents.length} incident${incidents.length === 1 ? "" : "s"} found`}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadIncidents()}
                disabled={incidentsLoading}
                className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${incidentsLoading ? "animate-spin" : ""}`} />
                Refresh Incidents
              </Button>
            </div>

            {incidents.length === 0 && !incidentsLoading ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
                No recovery incidents found.
              </div>
            ) : null}

            <div className="grid gap-4">
              {incidents.map((incident) => (
                <Card key={`${incident.campaignId}-${incident.code}`} className="rounded-2xl border border-zinc-200 bg-white/88 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={incident.severity} />
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                          {incident.pipeline}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                          {incident.code}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">{incident.message}</h3>
                        <p className="mt-1 break-all font-mono text-xs text-zinc-500">{incident.campaignId}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Campaign</p>
                          <p className="mt-1 text-sm text-zinc-800">{incident.campaignStatus || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Progress</p>
                          <p className="mt-1 text-sm text-zinc-800">{incident.progressStatus || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Done / Target</p>
                          <p className="mt-1 text-sm text-zinc-800">{incident.doneTotal} / {incident.targetTotal}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Event</p>
                          <p className="mt-1 text-sm text-zinc-800">{incident.eventCode || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Updated</p>
                          <p className="mt-1 text-sm text-zinc-800">{formatDateTime(incident.updatedAt)}</p>
                        </div>
                      </div>
                      <LocksSummary incident={incident} />
                    </div>

                    <div className="w-full shrink-0 space-y-2 xl:w-72">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Recommended Actions</p>
                      {incident.recommendedActions.length === 0 ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                          No action recommended.
                        </div>
                      ) : (
                        incident.recommendedActions.map((action) => (
                          <div key={action} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                            <p className="text-sm font-semibold text-zinc-900">{actionLabel(action)}</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openActionConfirm(incident, action, true)}
                                className="h-9 border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Dry Run
                              </Button>
                              <Button
                                type="button"
                                onClick={() => openActionConfirm(incident, action, false)}
                                className="btn-sidebar-noise h-9 px-3 text-xs font-semibold"
                              >
                                <Wrench className="mr-1.5 h-3.5 w-3.5" />
                                {actionLabel(action)}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recovery Guide" description="Short operational guidance for common warnings and errors.">
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {guideLoading ? (
              <div className="col-span-full flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading recovery guide...
              </div>
            ) : guideItems.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                No guide items found.
              </div>
            ) : (
              guideItems.map((item) => (
                <div key={item.code} className="rounded-2xl border border-zinc-200 bg-white/88 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{item.code}</p>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.resolution}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close recovery confirmation"
            className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
            onClick={closeActionConfirm}
          />

          <Card className="relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-[0_24px_40px_-24px_rgba(2,10,27,0.6)]">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {pendingAction.dryRun ? "Confirm Dry Run" : "Confirm Recovery Action"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-900">{actionLabel(pendingAction.action)}</h2>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500">{pendingAction.incident.campaignId}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-600">
                This action is manual and campaign-scoped. It will not run Docker, SQL, delete, restart, or cleanup controls.
              </div>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin Reason</span>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={pendingAction.dryRun ? "checking recovery" : "Why are you running this recovery action?"}
                  className="min-h-24 border-zinc-200 bg-white"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={actionSaving}
                onClick={closeActionConfirm}
                className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={actionSaving}
                onClick={() => void confirmRecoveryAction()}
                className={pendingAction.dryRun ? "h-9 border border-zinc-200 bg-white px-4 text-zinc-800 hover:bg-zinc-50" : "btn-sidebar-noise h-9 px-4"}
              >
                {actionSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : pendingAction.dryRun ? <TerminalSquare className="mr-2 h-4 w-4" /> : <Wrench className="mr-2 h-4 w-4" />}
                {pendingAction.dryRun ? "Run Dry Check" : "Run Recovery"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
