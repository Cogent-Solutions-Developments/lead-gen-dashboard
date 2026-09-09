import type { ContentGenerationRecovery, ContentGenerationRecoveryLimits } from "./contentGenerationAdmin.ts";

export const RECOVERY_REASON_LABELS: Record<string, string> = {
  token_limit: "Token allowance reached",
  request_limit: "Request allowance reached",
  cost_limit: "Cost allowance reached",
  projected_cost_limit: "The next request exceeds the cost allowance",
  budget_limit: "Application budget reached",
  user_pause: "Paused by an admin",
};

export function validateRecoveryLimits(
  limits: ContentGenerationRecoveryLimits,
  recovery: ContentGenerationRecovery,
  usage: { totalTokens: number; requests: number; estimatedCostUsd: number },
): string | null {
  if (!recovery.canContinue) return recovery.blockedReason || "This run cannot be continued yet.";
  const fields = [
    ["tokenLimit", "Token", usage.totalTokens, true],
    ["requestLimit", "Request", usage.requests, true],
    ["costLimitUsd", "Cost", usage.estimatedCostUsd, false],
  ] as const;
  for (const [key, label, used, integer] of fields) {
    const value = limits[key];
    if (!Number.isFinite(value) || (integer && !Number.isSafeInteger(value)) || value <= used
      || value < recovery.currentLimits[key] || value > recovery.maximumLimits[key]) {
      return `${label} limit must preserve the current allowance, exceed usage, and stay within the maximum.`;
    }
  }
  if (recovery.reasons.includes("projected_cost_limit") && limits.costLimitUsd <= recovery.currentLimits.costLimitUsd) {
    return "Increase the cost limit to allow the next request.";
  }
  if (recovery.reasons.includes("budget_limit") && fields.every(([key]) => limits[key] === recovery.currentLimits[key])) {
    return "Increase a budget before continuing this run.";
  }
  return null;
}
