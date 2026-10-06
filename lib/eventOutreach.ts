import type { DashboardOutreachTracking, DashboardOutreachTrackingItem } from "./api";

export const EMAIL_STAGES = [
  { key: "initialEmailCount", label: "First email", color: "#2563eb" },
  { key: "firstFollowUpEmailCount", label: "Follow-up 1", color: "#06b6d4" },
  { key: "secondFollowUpEmailCount", label: "Follow-up 2", color: "#10b981" },
  { key: "thirdFollowUpEmailCount", label: "Follow-up 3", color: "#f59e0b" },
  { key: "finalFollowUpEmailCount", label: "Final follow-up", color: "#8b5cf6" },
] as const;

export function emailStages(counts: Omit<DashboardOutreachTrackingItem, "campaignId" | "campaignName">) {
  const values = EMAIL_STAGES.map((stage) => ({ ...stage, value: counts[stage.key] }));
  const unknown = Math.max(0, counts.followUpEmailCount - values.slice(1).reduce((sum, stage) => sum + stage.value, 0));
  return [...values, ...(unknown ? [{ key: "unknownFollowUpEmailCount", label: "Other follow-ups", color: "#71717a", value: unknown }] : [])];
}

export function eventInsights(totals: DashboardOutreachTracking["totals"], days: DashboardOutreachTracking["dailyActivity"]) {
  const activeDays = days.filter((day) => day.sentEmailCount > 0).toSorted((a, b) => a.date.localeCompare(b.date));
  const busiestDay = activeDays.reduce<(typeof activeDays)[number] | null>((best, day) => !best || day.sentEmailCount > best.sentEmailCount ? day : best, null);
  return {
    emailsPerLead: totals.contactedLeadCount > 0 ? totals.sentEmailCount / totals.contactedLeadCount : null,
    busiestDay,
    lastSendDay: activeDays.at(-1)?.date ?? null,
    dailyActivity: days.map((day) => ({ ...day, initialEmailCount: Math.max(0, day.sentEmailCount - day.followUpEmailCount) })),
  };
}

export function campaignShare(sent: number, eventSent: number) {
  return eventSent > 0 ? Math.min(100, Math.max(0, sent / eventSent * 100)) : 0;
}
