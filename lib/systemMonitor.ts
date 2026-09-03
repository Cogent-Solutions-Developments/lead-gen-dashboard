export type TrafficPoint = {
  timestamp: number;
  observed: boolean;
  requests: number | null;
  requestsPerSecond: number | null;
  serverErrors: number | null;
  clientErrors: number | null;
  accepted: number | null;
  writes: number | null;
  avgResponseMs: number | null;
  p95UpperBoundMs: number | null;
  slowOver10s: number;
  droppedBatches: number;
};

export type LiveMonitorSnapshot = {
  generatedAt: string;
  refreshSeconds: number;
  audience: {
    status: string;
    activeUsers: number | null;
    windowSeconds: number;
    byRole: { role: string; count: number }[];
  };
  database: { status: string; used: number | null; limit: number | null };
  traffic: {
    status: string;
    message?: string;
    points: TrafficPoint[];
    bucketSeconds?: number;
    windowMinutes?: number;
    workersReporting?: number;
    inFlight?: number | null;
    concurrencyTarget?: number | null;
    eventLoopLagMs?: number | null;
    partial?: boolean;
    lastMinute: {
      requests: number;
      acceptedWrites: number;
      serverErrors: number;
      clientErrors: number;
      accepted: number;
      errorPercent: number | null;
      avgResponseMs: number | null;
      observedSeconds: number;
    } | null;
  };
};

export function utilization(
  used: number | null | undefined,
  limit: number | null | undefined,
): number | null {
  if (
    used == null ||
    limit == null ||
    !Number.isFinite(used) ||
    !Number.isFinite(limit) ||
    limit <= 0
  )
    return null;
  return Math.max(0, Math.round((used / limit) * 100));
}

export function pressureLevel(
  value: number | null,
): "Unknown" | "Normal" | "Busy" | "High" {
  return value == null
    ? "Unknown"
    : value >= 85
      ? "High"
      : value >= 60
        ? "Busy"
        : "Normal";
}

export function safeDashboardLink(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function deliveryDistribution(
  rows: { channel: string; status: string; count: number }[],
  channel: string,
) {
  const counts = new Map<string, number>();
  for (const row of rows)
    if (row.channel === channel)
      counts.set(row.status, (counts.get(row.status) || 0) + row.count);
  return [
    {
      label: "Waiting",
      value: (counts.get("queued") || 0) + (counts.get("retry") || 0),
      color: "#64748b",
      detail: "Scheduled or waiting to retry",
    },
    {
      label: "Processing",
      value: (counts.get("locked") || 0) + (counts.get("sending") || 0),
      color: "#2563eb",
      detail: "Being handled by a worker",
    },
    {
      label: "Awaiting result",
      value: counts.get("delivered_to_make") || 0,
      color: "#d97706",
      detail: "Provider accepted; final queue result pending",
    },
    {
      label: "Confirmed",
      value: counts.get("sent") || 0,
      color: "#059669",
      detail: "A successful final queue result was recorded",
    },
    {
      label: "Failed",
      value: counts.get("failed") || 0,
      color: "#e11d48",
      detail: "A failure was recorded; inspect before retrying",
    },
  ];
}
