import type { OutreachDepartment } from "./automatedOutreach";

export type StatusMailSummary = { sent: number; sent24h: number; awaitingConfirmation: number; scheduledLeads: number; needsAttention: number; pausedLeads: number };
export type StatusLeadMailData = { sent: number; nextDueAt: string | null; reason: string | null; messages: { step: number; status: string; confirmedAt: string | null; sentAt: string | null; updatedAt: string }[] };
export type StatusActivityBucket = { key: string; label: string; count: number; updated24h: number; lastUpdatedAt: string | null; mail?: StatusMailSummary };
export type StatusActivityBoard = { items: StatusActivityBucket[]; events: { key: string; name: string }[]; total: number; updated24h: number; asOf: string; refreshSeconds: number; mail?: StatusMailSummary };
export type StatusActivityLead = {
  id: string; name: string; company: string | null; email: string | null;
  eventKey: string; eventName: string; department: OutreachDepartment;
  status: string; deliveryState: string; actor: string | null; owner: string | null;
  updatedAt: string; comment: string | null;
  previousStatus: string | null; previousActor: string | null; previousAt: string | null;
  mail?: StatusLeadMailData;
};
export type StatusHistoryEntry = {
  id: string; status: string; previousStatus: string | null; actor: string | null;
  previousActor: string | null; owner: string | null; at: string; previousAt: string | null; comment: string | null;
};
export type StatusActivityPage<T> = { items: T[]; total: number; offset: number; limit: number };

export function statusActivityPath(department: string, eventKey: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (department) params.set("department", department);
  if (eventKey) params.set("eventKey", eventKey);
  return params.toString();
}

export function statusChartScale(items: StatusActivityBucket[], previous: StatusActivityBucket[] = []) {
  const largest = Math.max(0, ...items.map(item => item.count), ...previous.map(item => item.count));
  if (!largest) return { maximum: 1, step: 1 };
  const targetStep = largest / 4;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalized = targetStep / magnitude;
  const multiple = [1, 2, 2.5, 5, 10].find(value => value >= normalized) ?? 10;
  const step = Math.max(1, Math.ceil(multiple * magnitude));
  // Leave room for count labels without adding an entire empty interval.
  return { maximum: Math.ceil((largest + step * 0.25) / step) * step, step };
}

export function statusActivityTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

export function statusMailStep(mail: StatusLeadMailData, step: number, deliveryState: string) {
  const message = mail.messages.find(item => item.step === step);
  const confirmed = Boolean(message?.confirmedAt) || step <= mail.sent;
  const states: Record<string, { label: string; tone: string }> = {
    handing_off: { label: "Sending", tone: "pending" },
    accepted: { label: "Awaiting confirmation", tone: "pending" },
    uncertain: { label: "Needs checking", tone: "error" }, failed: { label: "Failed", tone: "error" },
    bounced: { label: "Bounced", tone: "error" }, unsubscribed: { label: "Unsubscribed", tone: "muted" },
    preview_failed: { label: "Content failed", tone: "error" },
    preview_queued: { label: "Content queued", tone: "pending" }, preview_generating: { label: "Preparing content", tone: "pending" },
    generating: { label: "Preparing content", tone: "pending" }, preview: { label: "Content ready", tone: "ready" },
    delivered: { label: "Delivered", tone: "sent" }, opened: { label: "Opened", tone: "sent" },
    clicked: { label: "Clicked", tone: "sent" }, replied: { label: "Replied", tone: "sent" },
  };
  if (message && states[message.status]) return { ...states[message.status], at: confirmed ? message.confirmedAt : null };
  if (confirmed) return { label: "Sent", tone: "sent", at: message?.confirmedAt || null };
  if (["stopped", "completed", "excluded", "opted_out", "replied", "bounced"].includes(deliveryState)) return { label: "Stopped", tone: "muted", at: null };
  if (deliveryState === "paused") return { label: "Paused", tone: "muted", at: null };
  if (deliveryState === "blocked") return { label: "Blocked", tone: "error", at: null };
  return { label: step === mail.sent + 1 && mail.nextDueAt ? "Planned" : "Not sent", tone: "muted", at: null };
}
