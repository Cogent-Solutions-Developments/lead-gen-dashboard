import { STATUS_ACTIVITY_TIME_ZONE, statusActivityDateError, statusActivityPath, statusMailStep,
  type StatusActivityDateRange, type StatusActivityLead } from "./statusOutreachActivity";

export type StatusOutreachReportFilters = StatusActivityDateRange & { department: string; eventKey: string };
export type StatusOutreachReportSnapshot = { items: StatusActivityLead[]; total: number; asOf: string };
type ReadSnapshot = (path: string, signal?: AbortSignal) => Promise<StatusOutreachReportSnapshot>;
/** The server materializes every eligible status in one consistent read-only transaction. */
export async function collectStatusOutreachReport(filters: StatusOutreachReportFilters, readSnapshot: ReadSnapshot, signal?: AbortSignal) {
  const dateError = statusActivityDateError(filters);
  if (dateError) throw new Error(dateError);
  signal?.throwIfAborted();
  const query = statusActivityPath(filters.department, filters.eventKey, {
    startDate: filters.startDate, endDate: filters.endDate, timezone: STATUS_ACTIVITY_TIME_ZONE,
  });
  const snapshot = await readSnapshot(`/status-activity/report?${query}`, signal);
  signal?.throwIfAborted();
  if (!snapshot || !Number.isInteger(snapshot.total) || snapshot.total < 0 || !Array.isArray(snapshot.items) ||
      snapshot.items.length !== snapshot.total || typeof snapshot.asOf !== "string" ||
      !snapshot.asOf.endsWith("Z") || !Number.isFinite(Date.parse(snapshot.asOf)) ||
      !snapshot.items.every(row => row && typeof row.id === "string" && row.id.trim().length > 0) ||
      new Set(snapshot.items.map(row => row.id)).size !== snapshot.total) {
    throw new Error("Could not retrieve a complete report snapshot. Please retry.");
  }
  return snapshot;
}

/** Excel stores local wall-clock dates without a timezone. All exported dates are Sri Lanka time. */
function reportDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp + 330 * 60000);
}

function label(value: string | null | undefined) {
  return value ? value.replace(/[-_]+/g, " ").replace(/\b\w/g, char => char.toUpperCase()) : "";
}

export function createStatusOutreachReport(rows: StatusActivityLead[], filters: StatusOutreachReportFilters, generatedAt = new Date()) {
  const dateError = statusActivityDateError(filters);
  if (dateError) throw new Error(dateError);
  const headers = ["Lead ID", "Name", "Company", "Email", "Department", "Event", "Owner", "Current status", "Previous status",
    "Updated by", "Latest status update (Sri Lanka time)", "Previous status update (Sri Lanka time)", "Latest comment", "Delivery state",
    "Confirmed emails (lifetime)",
    ...[1, 2, 3].flatMap(step => [`Email ${step} status`, `Email ${step} confirmed at (Sri Lanka time)`]),
    "Next planned send (Sri Lanka time)", "Delivery issue"];
  const statusCounts = new Map<string, number>();
  let confirmedEmails = 0, awaitingConfirmation = 0, scheduledLeads = 0, needsAttention = 0, pausedLeads = 0, missingMailData = 0;
  for (const lead of rows) {
    const status = label(lead.status) || "Not recorded";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (lead.mail) {
      confirmedEmails += lead.mail.sent;
      if (lead.mail.messages.some(message => message.status === "accepted" && !message.confirmedAt)) awaitingConfirmation++;
      if (lead.mail.nextDueAt) scheduledLeads++;
    } else missingMailData++;
    if (["attention", "failed", "blocked"].includes(lead.deliveryState)) needsAttention++;
    if (lead.deliveryState === "paused") pausedLeads++;
  }
  const records = rows.map(lead => [lead.id, lead.name, lead.company, lead.email, label(lead.department), lead.eventName, lead.owner,
    label(lead.status) || "Not recorded", label(lead.previousStatus), lead.actor, reportDate(lead.updatedAt), reportDate(lead.previousAt), lead.comment,
    label(lead.deliveryState), lead.mail?.sent ?? null,
    ...[1, 2, 3].flatMap(step => lead.mail ? [statusMailStep(lead.mail, step, lead.deliveryState).label,
      reportDate(lead.mail.messages.find(message => message.step === step)?.confirmedAt)] : ["Not recorded", null]),
    reportDate(lead.mail?.nextDueAt), lead.mail?.reason ?? null]);
  return {
    filename: `status-outreach_${filters.startDate}_to_${filters.endDate}.xlsx`,
    count: rows.length, headers, records,
    summary: {
      generatedAt: reportDate(generatedAt.toISOString())!, timezone: STATUS_ACTIVITY_TIME_ZONE,
      from: new Date(`${filters.startDate}T00:00:00Z`), to: new Date(`${filters.endDate}T00:00:00Z`),
      department: filters.department ? label(filters.department) : "All departments",
      event: filters.eventKey ? rows.find(lead => lead.eventKey === filters.eventKey)?.eventName || filters.eventKey : "All events",
      total: rows.length, confirmedEmails, awaitingConfirmation, scheduledLeads, needsAttention, pausedLeads, missingMailData,
      statuses: Array.from(statusCounts).sort(([a], [b]) => {
        const workflow = ["New", "First Call", "Interested", "Proposal Sent", "Confirmed", "Not Interested"];
        const rank = (status: string) => workflow.includes(status) ? workflow.indexOf(status) : workflow.length;
        return rank(a) - rank(b) || a.localeCompare(b);
      }).map(([status, count]) => ({ status, count })),
    },
  };
}

export type StatusOutreachReport = ReturnType<typeof createStatusOutreachReport>;
