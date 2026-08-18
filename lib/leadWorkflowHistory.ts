import type { WorkflowStatusHistoryItem } from "@/lib/apiRouter";

function displayName(displayName?: string | null, username?: string | null, fallback = "Unknown user") {
  return String(displayName || username || "").trim() || fallback;
}

export function workflowHistoryAttributionText(entry: WorkflowStatusHistoryItem) {
  const executor = displayName(entry.updatedByUserDisplayName, entry.updatedByUsername);
  if (entry.isTakeoverExecution) {
    const owner = displayName(entry.taskOwnerDisplayName, entry.taskOwnerUsername, "");
    if (!owner) return `Task executed by ${executor}.`;
    if (entry.taskOwnerIsActive === false) return `Task executed by ${executor} for inactive user ${owner}.`;
    return `Task executed by ${executor} on behalf of ${owner}.`;
  }
  return entry.updatedByUserIsActive === false
    ? `Updated by ${executor} (inactive at present).`
    : `Updated by ${executor}.`;
}

export function formatUsd(value?: number | string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
