// Shared lifecycle interpretation. Cancelled/failed runs are never resumable.
export function generationStatus(job: { state?: string; pause_requested?: boolean; pauseRequested?: boolean }) {
  const state = String(job.state || "").toUpperCase();
  if (state === "PAUSED") return "paused" as const;
  if (["SUCCESS", "FAILURE", "FAILED", "CANCELLED"].includes(state)) return "idle" as const;
  if (state === "PAUSING" || job.pause_requested || job.pauseRequested) return "stopping" as const;
  if (["PENDING", "QUEUED", "STARTED", "PROGRESS", "RETRY"].includes(state)) return "running" as const;
  return "idle" as const;
}
