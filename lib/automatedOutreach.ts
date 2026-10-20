export type OutreachDepartment = "sales" | "delegate" | "production";

export const OUTREACH_DEPARTMENTS: { key: OutreachDepartment; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "delegate", label: "Delegate" },
  { key: "production", label: "Production" },
];

export type OutreachState = "active" | "paused" | "stopped" | "opted_out" | "replied" | "bounced" | "completed" | "blocked" | "excluded" | "failed" | "attention";
export type OutreachAction = "pause" | "resume" | "stop" | "opt_out" | "retry";

export type OutreachMessage = {
  id: string; step: number; status: string; subject: string | null; body: string | null;
  intent: string | null; configRevision: number; tracking: Record<string, string>;
  error: string | null; createdAt: string; updatedAt: string;
};

export type OutreachLead = {
  id: string; department: OutreachDepartment; eventKey: string; eventName: string;
  email: string | null; lead: { name: string; title: string | null; company: string | null; phone: string | null; linkedinUrl: string | null };
  workflowStatus: string; state: OutreachState; reason: string | null; sentCount: number;
  nextDueAt: string | null; enrolledAt: string; messages: OutreachMessage[];
};

export type OutreachConfiguration = {
  enabled: boolean; revision: number; senderName: string; senderEmail: string;
  model: string; prompt: string; intervalDays: number; maxSends: number;
  modelOptions: string[]; reasoningEffort: "none" | "low" | "medium" | "high";
  maxOutputTokens: number; callbackBaseUrl: string; callbackSecretConfigured: boolean;
  apiKeySource: "AGENTIC_CONTENT_OPENAI_API_KEY";
  webhooks: Record<OutreachDepartment, { configured: boolean; maskedUrl: string | null }>;
  missingConfiguration: string[]; lastScanAt: string | null; statusPolicy: string;
};

export type OutreachSummary = {
  states: Partial<Record<OutreachState, number>>;
  departments: { department: OutreachDepartment; leads: number; sent: number; active: number }[];
  daily: { date: string; sent: number }[];
  configuration: OutreachConfiguration;
};

export type OutreachEvent = { key: string; name: string; leads: number; active: number; statuses: Record<string, number> };
export type OutreachLeadsResponse = { items: OutreachLead[]; total: number; offset: number; limit: number; tabs: { key: string; label: string; count: number }[] };
export type OutreachAudit = { id: string; enrollmentId: string | null; action: string; actor: string; details: Record<string, unknown>; createdAt: string };

export function outreachActions(lead: Pick<OutreachLead, "state" | "email" | "messages">): OutreachAction[] {
  if (lead.state === "opted_out") return [];
  if (["stopped", "replied", "bounced", "completed"].includes(lead.state)) return lead.email ? ["opt_out"] : [];
  const actions: OutreachAction[] = lead.state === "paused" ? ["resume", "stop"] : ["pause", "stop"];
  if (lead.state === "failed" && lead.messages.some((m) => m.status === "failed" && !m.subject)) actions.unshift("retry");
  if (lead.email) actions.push("opt_out");
  return actions;
}

export function statusLabel(value: string) {
  return value.replaceAll(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function outreachDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
