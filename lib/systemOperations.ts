import type {
  SystemOperationIncident,
  SystemOperationLogService,
} from "@/lib/auth";

export const SYSTEM_OPERATION_SERVICES = [
  {
    key: "api",
    name: "Web application",
    detail: "Receives dashboard and integration requests",
  },
  {
    key: "worker",
    name: "Sales processing",
    detail: "Runs sales research and campaign work",
  },
  {
    key: "delegate_worker",
    name: "Delegate processing",
    detail: "Runs delegate research and campaign work",
  },
  {
    key: "production_worker",
    name: "Production processing",
    detail: "Runs production research and campaign work",
  },
  {
    key: "send_worker",
    name: "Message delivery",
    detail: "Processes outbound email and messaging work",
  },
  {
    key: "auth_worker",
    name: "Account processing",
    detail: "Handles authentication background work",
  },
  {
    key: "beat",
    name: "Scheduler",
    detail: "Starts recurring background tasks",
  },
] as const;

export const RECOVERY_ACTIONS: Record<
  string,
  { label: string; detail: string }
> = {
  "unlock-content": {
    label: "Release content hold",
    detail: "Clears the stale content lock for this campaign only.",
  },
  "trigger-content-catchup": {
    label: "Resume content work",
    detail: "Asks the existing content dispatcher to continue stored work.",
  },
  "unlock-profile-batch": {
    label: "Release validation hold",
    detail: "Clears the stale profile-validation lock for this campaign only.",
  },
  "trigger-profile-dispatcher": {
    label: "Resume profile validation",
    detail:
      "Asks the existing dispatcher to continue from its stored position.",
  },
};

export const INCIDENT_EXPLANATIONS: Record<
  string,
  { title: string; impact: string; next: string }
> = {
  stale_content_lock: {
    title: "Content work appears paused",
    impact:
      "This campaign may not create the remaining drafts until its old hold is released.",
    next: "Run a safe check, then release the content hold before resuming content work.",
  },
  stale_profile_batch_lock: {
    title: "Profile validation appears paused",
    impact:
      "New contacts for this campaign may wait while an old validation hold remains active.",
    next: "Run a safe check, then release the validation hold before resuming validation.",
  },
  stale_progress: {
    title: "Campaign progress has stopped updating",
    impact:
      "The campaign is still marked as running, but no recent progress was recorded.",
    next: "Run a safe check before asking the appropriate dispatcher to continue.",
  },
};

export type LogFilter = "all" | "warning" | "error";

export function actionDetails(action: string) {
  return (
    RECOVERY_ACTIONS[action] ?? {
      label: action.replaceAll("-", " "),
      detail: "Runs the selected campaign-scoped recovery step.",
    }
  );
}

export function incidentExplanation(code: string) {
  return (
    INCIDENT_EXPLANATIONS[code] ?? {
      title: "Campaign needs attention",
      impact:
        "The system found a condition that may prevent this campaign from progressing.",
      next: "Run a safe check before applying a recommended recovery step.",
    }
  );
}

export function humanizePipeline(value?: string | null) {
  const normalized = String(value || "unknown")
    .trim()
    .toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function progressPercentage(done: number, target: number) {
  if (!Number.isFinite(done) || !Number.isFinite(target) || target <= 0)
    return null;
  return Math.max(0, Math.min(100, Math.round((done / target) * 100)));
}

export function countLockedWorkflows(incidents: SystemOperationIncident[]) {
  const locks = new Set<string>();
  for (const incident of incidents) {
    if (incident.locks.contentInProgress)
      locks.add(`${incident.campaignId}:content`);
    if (incident.locks.batchInProgress)
      locks.add(`${incident.campaignId}:batch`);
  }
  return locks.size;
}

export function countSafeChecks(incidents: SystemOperationIncident[]) {
  const checks = new Set<string>();
  for (const incident of incidents)
    for (const action of incident.recommendedActions)
      checks.add(`${incident.campaignId}:${action}`);
  return checks.size;
}

export function countCampaigns(incidents: SystemOperationIncident[]) {
  return new Set(incidents.map((incident) => incident.campaignId)).size;
}

export function countAvailableLogs(services: SystemOperationLogService[]) {
  return services.filter((service) => service.exists).length;
}

export function incidentsByPipeline(incidents: SystemOperationIncident[]) {
  const counts = new Map<string, Set<string>>([
    ["sales", new Set()],
    ["delegate", new Set()],
    ["production", new Set()],
  ]);
  for (const incident of incidents) {
    const pipeline = String(incident.pipeline || "unknown").toLowerCase();
    if (!counts.has(pipeline)) counts.set(pipeline, new Set());
    counts.get(pipeline)?.add(incident.campaignId);
  }
  return [...counts.entries()].map(([pipeline, campaigns]) => ({
    pipeline,
    name: humanizePipeline(pipeline),
    campaigns: campaigns.size,
  }));
}

export function logLineLevel(line: string): Exclude<LogFilter, "all"> | "info" {
  const normalized = line.toLowerCase();
  if (/\b(error|critical|fatal|exception|traceback|failed)\b/.test(normalized))
    return "error";
  if (/\b(warn|warning|deprecated|retry)\b/.test(normalized)) return "warning";
  return "info";
}

export function filterLogLines(lines: string[], filter: LogFilter) {
  return filter === "all"
    ? lines
    : lines.filter((line) => logLineLevel(line) === filter);
}

export function formatRelativeTime(
  value?: string | null,
  now: number = Date.now(),
) {
  if (!value) return "Update time unavailable";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Update time unavailable";
  const seconds = Math.round((now - timestamp) / 1000);
  if (seconds < 0) return "Updated just now";
  if (seconds < 60) return "Updated less than a minute ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}
