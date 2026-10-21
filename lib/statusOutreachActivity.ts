import type { OutreachDepartment } from "./automatedOutreach";

export type StatusActivityBucket = { key: string; label: string; count: number; updated24h: number; lastUpdatedAt: string | null };
export type StatusActivityBoard = { items: StatusActivityBucket[]; events: { key: string; name: string }[]; total: number; updated24h: number; asOf: string; refreshSeconds: number };
export type StatusActivityLead = {
  id: string; name: string; company: string | null; email: string | null;
  eventKey: string; eventName: string; department: OutreachDepartment;
  status: string; deliveryState: string; actor: string | null; owner: string | null;
  updatedAt: string; comment: string | null;
  previousStatus: string | null; previousActor: string | null; previousAt: string | null;
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
